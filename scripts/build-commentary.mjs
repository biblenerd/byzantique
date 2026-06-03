// Build-time commentary pipeline: Markdown notes (+ frontmatter anchor) → per-book JSON.
// REQUIREMENTS.md §5.2/§6. Phase 0: a single sample note on Genesis 1:1.
//
// Output: public/data/commentary/<CODE>.json  (array of notes), + manifest.json
//   note = { id, title, tags, anchor: { book, sc, sv, ec, ev, type, ref }, span, html }

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { marked } from 'marked';
import { scriptureQuote, refLink, refPreview } from '../src/lib/scripture.ts'; // run with --experimental-strip-types

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data/commentary');
const OUT = path.join(ROOT, 'public/data/commentary');

const WHOLE_CHAPTER_END = 999;

// Replace standalone `{{ REF }}` lines with the resolved scripture blockquote (before Markdown parse).
function expandScripture(md) {
  return md.replace(/^[ \t]*\{\{\s*([^}\n]+?)\s*\}\}[ \t]*$/gm, (m, refStr) => {
    const html = scriptureQuote(refStr.trim());
    if (!html) console.warn(`  ! unresolved scripture include: {{ ${refStr.trim()} }}`);
    return html ?? m;
  });
}

const attrEsc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Resolve inline cross-references `[text](ref:JHN 1:1)` → an internal link (with a
// precompiled first-verse hover preview). A bad ref fails the build (REQUIREMENTS §5.7).
function expandRefs(md, file) {
  return md.replace(/\[([^\]]+)\]\(ref:([^)]+)\)/g, (_, text, ref) => {
    const r = ref.trim();
    const link = refLink(r);
    if (!link) throw new Error(`${path.relative(ROOT, file)}: unresolved cross-reference [${text}](ref:${r})`);
    const prev = refPreview(r);
    const attr = prev ? ` data-ref-preview="${attrEsc(prev)}"` : '';
    return `<a class="xref" href="${link.href}"${attr}>${text}</a>`;
  });
}

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

// Numbered author footnotes: `text[^id]` callers + `[^id]: …` definitions. Numbered in
// order of first reference; ids are namespaced per note so they never collide on a page.
// Reuses the .tn-list / .fn-ref structure so the footnote tooltip island works as-is.
function processFootnotes(md, noteId, file) {
  // Extract definitions line-by-line so indented continuation lines are consumed
  // (otherwise a 4-space wrap would be left behind and render as a code block).
  const lines = md.split('\n');
  const defs = new Map();
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\[\^([^\]\s]+)\]:[ \t]*(.*)$/);
    if (!m) { kept.push(lines[i]); continue; }
    let text = m[2];
    while (i + 1 < lines.length && /^(\s{2,}|\t)\S/.test(lines[i + 1])) {
      text += ' ' + lines[i + 1].trim();
      i++;
    }
    defs.set(m[1], text.trim());
  }
  md = kept.join('\n');
  if (!defs.size) return { md, footnotesHtml: '' };

  const order = [];
  md = md.replace(/\[\^([^\]\s]+)\]/g, (m, id) => {
    if (!defs.has(id)) return m;
    let n = order.indexOf(id);
    if (n === -1) { order.push(id); n = order.length - 1; }
    const num = n + 1;
    return `<sup class="fn-ref"><a id="fnref-${noteId}-${num}" href="#fn-${noteId}-${num}">${num}</a></sup>`;
  });

  let footnotesHtml = '';
  if (order.length) {
    const items = order
      .map((id, i) => {
        const num = i + 1;
        const body = marked.parseInline(expandRefs(defs.get(id), file));
        return `<li id="fn-${noteId}-${num}"><a class="tn-letter" href="#fnref-${noteId}-${num}">${num}</a><span class="tn-body">${body}</span></li>`;
      })
      .join('');
    footnotesHtml = `<section class="note-fn ui"><ul class="tn-list">${items}</ul></section>`;
  }
  return { md, footnotesHtml };
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true }); // start clean (drop stale books)
  fs.mkdirSync(OUT, { recursive: true });
  const byBook = new Map();

  for (const file of walk(SRC)) {
    const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (!data.anchor) { console.warn(`  ! ${path.relative(ROOT, file)}: no anchor`); continue; }
    const ref = parseRef(data.anchor);
    if (!ref) { console.warn(`  ! ${path.relative(ROOT, file)}: bad anchor "${data.anchor}"`); continue; }

    const note = {
      id: path.basename(file, '.md'),
      title: data.title ?? '',
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      anchor: { ...ref, type: anchorType(ref), ref: data.anchor },
      span: (ref.ec - ref.sc) * 1000 + (ref.ev - ref.sv),
      html: (() => {
        const fn = processFootnotes(body.trim(), path.basename(file, '.md'), file);
        return marked.parse(expandRefs(expandScripture(fn.md), file)) + fn.footnotesHtml;
      })(),
    };
    if (!byBook.has(ref.book)) byBook.set(ref.book, []);
    byBook.get(ref.book).push(note);
  }

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
