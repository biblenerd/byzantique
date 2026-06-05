// Build-time text pipeline: vendored USFM → normalized per-book JSON.
// REQUIREMENTS.md §9. Phase 1: whole Bible (englxxup OT + engtcent NT).
//
// We parse USFM ourselves (a focused, line-oriented parser) so the JSON preserves
// the *block structure* — prose paragraphs (which flow) vs. poetry lines (which
// break, with indent levels) and stanza breaks — which generic libraries drop.
//
// Output  public/data/texts/<CODE>.json:
//   { code, name, chapters: [ { number, blocks: [ Block ] } ] }
//   Block = { kind, level?, segments?: Segment[] }
//     kind: 'p' prose paragraph | 'q' poetry line | 'd' Hebrew/Psalm title | 'b' stanza break
//         | 's' section heading ({ text, level, major? })
//     Segment = { v: <label>, n: <numeric start> }  (a verse marker)
//             | { t: <text> }                        (a run of text)

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC_DIRS = [path.join(ROOT, 'data/texts/englxxup'), path.join(ROOT, 'data/texts/engtcent')];
const OUT_DIR = path.join(ROOT, 'public/data/texts');

// Reconcile ENGLXXUP source ids with our canon codes (see USFM-BOOK-NAMES.md).
const CODE_REMAP = { ESG: 'EST', DAG: 'DAN' };

// Markers we skip entirely (identification, intro, reference lines). Section
// headings (\s#, \ms#) are captured below; \sr/\mr/\r reference lines and \sp
// speaker labels stay skipped.
const SKIP = /^(ide|usfm|h|toc\d?|toca\d?|mt\d?|mte\d?|mr|sr|sd\d?|r|rem|sts|cl|cp|periph|imt\d?|is\d?|ip|ipi|im|imi|ipq|imq|ipr|iq\d?|ib|ili\d?|iot|io\d?|iex|imte\d?|ie|sp)$/;
// Prose paragraph markers (verses flow within).
const PROSE = /^(p|m|pi\d?|pc|pr|pmo|pm|pmc|pmr|nb|cls|mi|po|lh|lf|li\d?|lim\d?|ph\d?|tr)$/;

// --- inline cleanup: strip USFM character markup, keep readable text ---
function cleanInline(s) {
  let t = s;
  // remove note-like content entirely (footnotes, cross-refs, figures, alt verse/chapter)
  t = t.replace(/\\(f|fe|x|fig|rq|ca|va|vp|ef|ex)\b[\s\S]*?\\\1\*/g, '');
  // \w word|attributes\w*  ->  word   (drop Strong's/lemma data)
  t = t.replace(/\\\+?w\s+([^\\|]*?)(?:\|[^\\]*?)?\\\+?w\*/g, '$1');
  // Italic/emphasis char styles -> a sentinel pair (rendered as <i> later, stripped in
  // plain-text contexts). \add = translator's addition (Brenton italics); it/bk/em/qt/tl/nd
  // are the usual italicized styles. Must run before the generic marker strip below.
  const I0 = String.fromCharCode(0xe000), I1 = String.fromCharCode(0xe001);
  t = t.replace(/\\\+?(add|it|bk|em|qt|tl|nd)\b\s*([\s\S]*?)\\\+?\1\*/g, (_m, _n, inner) => I0 + inner + I1);
  // remaining character-style markers: drop the markers, keep their text
  t = t.replace(/\\\+?[a-z]+\d*\*/gi, ''); // closing \xx*
  t = t.replace(/\\\+?[a-z]+\d*\s?/gi, ''); // opening \xx
  t = t.replace(/\|[a-z0-9-]+="[^"]*"/gi, ''); // stray attributes
  return t.replace(/\s+/g, ' ').trim();
}

const verseStartNum = (label) => {
  const m = String(label).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Parse a footnote body (between \f and \f*) into { ref, html }.
// TCENT \f notes are BOTH text-critical variants (\fq lemma ¦ variant CT) and
// explanatory notes (translation/scribal notes, which nest \+it…\+it* italics).
// Sub-markers: \fr origin ref, \fq/\fqa quotation (lemma), \fk keyword, \ft text.
function parseFootnote(content) {
  let c = content.replace(/^[+\-?*"]\s*/, ''); // drop the caller
  c = esc(c); // escape HTML-special chars (markers are backslashes, unaffected)
  // nested paired char markers: emphasis kept as <em>, the rest flattened to text
  c = c.replace(/\\\+?(it|bk|em|qt|tl|nd)\b\s*([\s\S]*?)\\\+?\1\*/g, '<em>$2</em>');
  c = c.replace(/\\\+?([a-z]+)\d*\b\s*([\s\S]*?)\\\+?\1\d*\*/g, '$2');
  // origin reference
  let ref = '';
  c = c.replace(/\\fr\s+(\S+)\s*/, (_, r) => {
    ref = r.replace(/[:.]+$/, '');
    return '';
  });
  // structural runs (each runs until the next sub-marker)
  const parts = [];
  let matched = false;
  const re = /\\(fq|fqa|fk|ft|fl|fw|fp|fv|fdc|fm)\b\s*([^\\]*)/g;
  let m;
  while ((m = re.exec(c))) {
    matched = true;
    const t = m[2].replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (m[1] === 'fq' || m[1] === 'fqa') parts.push(`<em>${t}</em>`);
    else if (m[1] === 'fk') parts.push(`<strong>${t}</strong>`);
    else parts.push(t);
  }
  if (!matched) {
    return { ref, html: c.replace(/\\\+?[a-z]+\d*\*?/gi, '').replace(/\s+/g, ' ').trim() };
  }
  return { ref, html: parts.join(' ') };
}

function parseUsfm(usfm) {
  let code = null;
  let name = null;
  const chapters = [];
  let chapter = null;
  let block = null;

  const open = (kind, level) => {
    block = { kind, ...(level ? { level } : {}), segments: [] };
    chapter.blocks.push(block);
  };
  // Push text into the current block, extracting \f…\f* footnotes into the
  // chapter's footnote list and leaving an { f: index } marker inline.
  const pushText = (raw) => {
    const re = /\\f\s+(.*?)\\f\*/gs;
    let last = 0;
    let m;
    while ((m = re.exec(raw))) {
      const before = cleanInline(raw.slice(last, m.index));
      if (before) block.segments.push({ t: before });
      chapter.footnotes.push(parseFootnote(m[1]));
      block.segments.push({ f: chapter.footnotes.length - 1 });
      last = re.lastIndex;
    }
    const tail = cleanInline(raw.slice(last));
    if (tail) block.segments.push({ t: tail });
  };

  for (const raw of usfm.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;

    const m = line.match(/^\\(\+?[a-z]+\d*)\*?\s?([\s\S]*)$/i);
    const marker = m ? m[1] : null;
    const rest = m ? m[2] : line;

    if (marker === 'id') { code = rest.split(/\s/)[0]; continue; }
    if (marker === 'h' && !name) name = rest.trim();
    if (marker && SKIP.test(marker)) continue;

    if (marker === 'c') {
      chapter = { number: parseInt(rest, 10), blocks: [], footnotes: [] };
      chapters.push(chapter);
      block = null;
      continue;
    }
    if (!chapter) continue; // ignore anything before the first \c

    // Section heading (\s, \s1, \s2…, \ms = major). Text follows on the same line.
    if (/^m?s[0-9]?$/i.test(marker || '')) {
      const text = cleanInline(rest);
      if (text) {
        const digit = (marker.match(/\d/) || [])[0];
        const blk = { kind: 's', level: digit ? parseInt(digit, 10) : 1, text };
        if (/^ms/i.test(marker)) blk.major = true;
        chapter.blocks.push(blk);
      }
      block = null;
      continue;
    }

    if (/^q[0-9]?$/i.test(marker || '')) {
      open('q', marker.length > 1 ? parseInt(marker[1], 10) : 1);
      pushText(rest);
      continue;
    }
    if (marker === 'qr' || marker === 'qc' || marker === 'qa' || marker === 'qm') {
      open('q', 1);
      pushText(rest);
      continue;
    }
    if (marker === 'd') { open('d'); pushText(rest); continue; }
    if (marker === 'b') { chapter.blocks.push({ kind: 'b' }); block = null; continue; }
    if (PROSE.test(marker || '')) { open('p'); pushText(rest); continue; }

    if (marker === 'v') {
      if (!block) open('p');
      const vm = rest.match(/^(\S+)\s?([\s\S]*)$/);
      const label = vm ? vm[1] : rest;
      block.segments.push({ v: label, n: verseStartNum(label) });
      if (vm) pushText(vm[2]);
      continue;
    }

    // unmarked continuation, or an unknown marker carrying text
    if (!block) open('p');
    pushText(marker === null ? line : rest);
  }

  return { code, name: name || code, chapters };
}

function build() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true }); // start clean
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = [];

  for (const dir of SRC_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.usfm'))) {
      const usfm = fs.readFileSync(path.join(dir, file), 'utf8');
      const book = parseUsfm(usfm);
      if (!book.code) { console.warn(`  ! skipped ${file} (no \\id)`); continue; }
      book.code = CODE_REMAP[book.code] ?? book.code;

      // drop empty trailing blocks; count verses + footnotes
      let verses = 0;
      let notes = 0;
      for (const c of book.chapters) {
        c.blocks = c.blocks.filter(
          (b) => b.kind === 'b' || b.kind === 's' || (b.segments && b.segments.length),
        );
        for (const b of c.blocks) for (const s of b.segments ?? []) if ('v' in s) verses++;
        if (c.footnotes && c.footnotes.length) notes += c.footnotes.length;
        else delete c.footnotes; // keep OT (no notes) lean
      }

      fs.writeFileSync(path.join(OUT_DIR, `${book.code}.json`), JSON.stringify(book));
      manifest.push({ code: book.code, name: book.name, chapters: book.chapters.length, verses });
      console.log(`  ✓ ${book.code} ${book.name} — ${book.chapters.length} ch, ${verses} vv${notes ? `, ${notes} textual notes` : ''}`);
    }
  }

  manifest.sort((a, b) => a.code.localeCompare(b.code));
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nbuild-texts: ${manifest.length} book(s) → public/data/texts/`);
}

build();
