// Build-time commentary pipeline: Markdown notes (+ frontmatter anchor) → per-book JSON.
// REQUIREMENTS.md §5.2/§6. Phase 0: a single sample note on Genesis 1:1.
//
// Output: public/data/commentary/<CODE>.json  (array of notes), + manifest.json
//   note = { id, title, tags, anchor: { book, sc, sv, ec, ev, type, ref }, span, html }

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { bookByCode } from '../src/lib/canon.ts'; // .ts imports: Node ≥22.18 strips types natively
import { renderAuthorHtml } from '../src/lib/shortcodes.ts';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data/commentary');
const OUT = path.join(ROOT, 'public/data/commentary');

const WHOLE_CHAPTER_END = 999;

// id → [{ id, book, testament, slug, type, sc }] for resolving note: cross-references.
// Populated by a first pass over all note files (see build()).
const NOTE_REGISTRY = new Map();

// Inverted "referenced elsewhere" index: targetBook → { targetChapter → [backlink] }.
// A backlink records that some note (its source anchor) references a verse in this chapter.
const BACKLINKS = {};

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    data[key] = val;
  }
  return { data, body: m[2] };
}

// Parse "GEN" (whole book), "GEN 1" (whole chapter), "GEN 1:1", "GEN 1:1-13",
// "GEN 1:1-2:3".
function parseRef(str) {
  str = String(str).trim();
  if (/^[0-9A-Za-z]+$/.test(str)) {
    // bare book code → whole book
    return { book: str.toUpperCase(), sc: 1, sv: 1, ec: 999, ev: WHOLE_CHAPTER_END, scope: 'book' };
  }
  const m = str.match(/^([0-9A-Za-z]+)\s+(\d+)(?::(\d+))?(?:[-–](?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const [, book, c1, v1, c2, v2] = m;
  const sc = +c1;
  const sv = v1 ? +v1 : 1;
  let ec = sc, ev = v1 ? +v1 : WHOLE_CHAPTER_END;
  if (v2 && c2) { ec = +c2; ev = +v2; }
  else if (v2) { ec = sc; ev = +v2; }
  return { book: book.toUpperCase(), sc, sv, ec, ev };
}

function anchorType(a) {
  if (a.scope === 'book') return 'book';
  if (a.ev === WHOLE_CHAPTER_END) return a.sc === a.ec ? 'chapter' : 'range';
  if (a.sc !== a.ec) return 'range';
  return a.sv === a.ev ? 'verse' : 'range';
}

// Human label for a note's source anchor, e.g. "Genesis 1:26", "Psalms 73:13–14", "Genesis".
function anchorLabel(ref, type, name) {
  if (type === 'book') return name;
  if (ref.ev === WHOLE_CHAPTER_END && ref.sc === ref.ec) return `${name} ${ref.sc}`;
  if (ref.sc === ref.ec) return ref.sv === ref.ev ? `${name} ${ref.sc}:${ref.sv}` : `${name} ${ref.sc}:${ref.sv}–${ref.ev}`;
  return `${name} ${ref.sc}:${ref.sv}–${ref.ec}:${ref.ev}`;
}

// Every scripture target a note references: `[…](ref:X)` (cited) and `{{ X }}` (quoted).
function refTargets(body) {
  const out = [];
  for (const m of body.matchAll(/\]\(ref:([^)]+)\)/g)) out.push({ ref: m[1].trim(), kind: 'link' });
  for (const m of body.matchAll(/\{\{\s*([^}\n]+?)\s*\}\}/g)) out.push({ ref: m[1].trim(), kind: 'quote' });
  return out;
}

// `[…](note:ID)` targets → the referenced note's own anchor (book, chapter, verse), so a
// note→note link backlinks onto that note's reference. Resolved against NOTE_REGISTRY.
function noteRefAnchors(body) {
  const out = [];
  for (const m of body.matchAll(/\]\(note:([^)]+)\)/g)) {
    const t = m[1].trim();
    const slash = t.indexOf('/');
    const book = slash === -1 ? null : t.slice(0, slash).toUpperCase();
    const nid = slash === -1 ? t : t.slice(slash + 1);
    let matches = NOTE_REGISTRY.get(nid) ?? [];
    if (book) matches = matches.filter((e) => e.book === book);
    if (matches[0]) out.push(matches[0]); // { book, sc, sv, ... }
  }
  return out;
}

// Record backlinks for one source note onto the verses it references (skipping same-page
// targets — those notes are already visible on that chapter). Quote beats link if a note
// both quotes and cites the same verse.
function collectBacklinks(srcRef, srcType, id, title, body) {
  const meta = bookByCode(srcRef.book);
  if (!meta) return;
  const src = anchorLabel(srcRef, srcType, meta.name);
  const href = `/${meta.testament}/${meta.slug}/${srcType === 'book' ? '' : srcRef.sc}#note-${id}`;
  const add = (book, sc, sv, kind) => {
    if (!bookByCode(book)) return;
    if (book === srcRef.book && srcRef.sc <= sc && sc <= srcRef.ec) return; // same-page
    const list = ((BACKLINKS[book] ??= {})[sc] ??= []);
    const dup = list.find((e) => e.sid === id && e.tv === sv);
    if (dup) { if (kind === 'quote') dup.kind = 'quote'; return; }
    list.push({ tv: sv, kind, title: title || '', src, href, sid: id });
  };
  // book-level target (a whole-book note lives on the book landing page, keyed "book")
  const addBook = (book) => {
    if (!bookByCode(book)) return;
    if (book === srcRef.book && srcType === 'book') return; // both on the book page
    const list = ((BACKLINKS[book] ??= {}).book ??= []);
    if (list.some((e) => e.sid === id)) return;
    list.push({ tv: 0, kind: 'link', title: title || '', src, href, sid: id });
  };
  // scripture references ({{ }} quoted, ref: cited)
  for (const { ref: targetStr, kind } of refTargets(body)) {
    const tr = parseRef(targetStr);
    if (tr) add(tr.book, tr.sc, tr.sv, kind);
  }
  // note→note references resolve to the referenced note's own anchor (its own reference)
  for (const a of noteRefAnchors(body)) {
    if (a.type === 'book') addBook(a.book);
    else add(a.book, a.sc, a.sv, 'link');
  }
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true }); // start clean (drop stale books)
  fs.mkdirSync(OUT, { recursive: true });
  const byBook = new Map();
  const files = walk(SRC);

  // Pass 1: register every note id so note: cross-references can resolve (and validate).
  for (const file of files) {
    const { data } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (!data.anchor) continue;
    const ref = parseRef(data.anchor);
    if (!ref) continue;
    const meta = bookByCode(ref.book);
    if (!meta) continue;
    const id = path.basename(file, '.md');
    const entry = { id, book: ref.book, testament: meta.testament, slug: meta.slug, type: anchorType(ref), sc: ref.sc, sv: ref.sv };
    if (!NOTE_REGISTRY.has(id)) NOTE_REGISTRY.set(id, []);
    NOTE_REGISTRY.get(id).push(entry);
  }

  // Pass 2: build each note's HTML (now note: refs can resolve against the registry).
  for (const file of files) {
    const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (!data.anchor) { console.warn(`  ! ${path.relative(ROOT, file)}: no anchor`); continue; }
    const ref = parseRef(data.anchor);
    if (!ref) { console.warn(`  ! ${path.relative(ROOT, file)}: bad anchor "${data.anchor}"`); continue; }

    // Context for the shortcode registry: error labels use the repo-relative path, and
    // note: cross-references resolve against the id registry built in pass 1.
    const ctx = {
      file: path.relative(ROOT, file),
      warn: (msg) => console.warn(msg),
      resolveNote: (id, book) => {
        let matches = NOTE_REGISTRY.get(id) ?? [];
        if (book) matches = matches.filter((m) => m.book === book);
        if (matches.length === 0) return null;
        if (matches.length > 1) return 'ambiguous';
        return matches[0];
      },
    };
    const note = {
      id: path.basename(file, '.md'),
      title: data.title ?? '',
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      anchor: { ...ref, type: anchorType(ref), ref: data.anchor },
      span: (ref.ec - ref.sc) * 1000 + (ref.ev - ref.sv),
      html: renderAuthorHtml(body.trim(), ctx, { footnotes: true }),
    };
    if (!byBook.has(ref.book)) byBook.set(ref.book, []);
    byBook.get(ref.book).push(note);

    collectBacklinks(ref, note.anchor.type, note.id, data.title ?? '', body);
  }

  // Write the "referenced elsewhere" index (sorted by verse, then source label).
  let blCount = 0;
  for (const code of Object.keys(BACKLINKS))
    for (const ch of Object.keys(BACKLINKS[code])) {
      BACKLINKS[code][ch].sort((a, b) => a.tv - b.tv || a.src.localeCompare(b.src));
      blCount += BACKLINKS[code][ch].length;
    }
  fs.writeFileSync(path.join(OUT, 'backlinks.json'), JSON.stringify(BACKLINKS, (k, v) => (k === 'sid' ? undefined : v)));
  console.log(`  ✓ backlinks — ${blCount} cross-reference(s)`);

  const manifest = {};
  for (const [code, notes] of byBook) {
    notes.sort((a, b) => a.anchor.sc - b.anchor.sc || a.anchor.sv - b.anchor.sv || b.span - a.span);
    fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify(notes));
    manifest[code] = notes.length;
    console.log(`  ✓ ${code} — ${notes.length} note(s)`);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nbuild-commentary: ${Object.keys(manifest).length} book(s) → public/data/commentary/`);
}

build();
