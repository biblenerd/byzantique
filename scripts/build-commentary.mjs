// Build-time commentary pipeline: Markdown notes (+ frontmatter anchor) → per-book JSON.
// REQUIREMENTS.md §5.2/§6. Phase 0: a single sample note on Genesis 1:1.
//
// Output: public/data/commentary/<CODE>.json  (array of notes), + manifest.json
//   note = { id, title, tags, anchor: { book, sc, sv, ec, ev, type, ref }, span, html }

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { marked } from 'marked';
import { scriptureQuote } from '../src/lib/scripture.ts'; // run with --experimental-strip-types

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

// Parse "GEN 1:1", "GEN 1:1-13", "GEN 1:1-2:3", "GEN 1" (whole chapter).
function parseRef(str) {
  const m = String(str).trim().match(/^([0-9A-Za-z]+)\s+(\d+)(?::(\d+))?(?:[-–](?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const [, book, c1, v1, c2, v2] = m;
  const sc = +c1;
  const sv = v1 ? +v1 : 1;
  let ec = sc, ev = v1 ? +v1 : WHOLE_CHAPTER_END;
  if (v2 && c2) { ec = +c2; ev = +v2; }
  else if (v2) { ec = sc; ev = +v2; }
  return { book, sc, sv, ec, ev };
}

function anchorType(a) {
  if (a.ev === WHOLE_CHAPTER_END || a.sc !== a.ec) return a.ev === WHOLE_CHAPTER_END ? 'book' : 'range';
  return a.sv === a.ev ? 'verse' : 'range';
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
      html: marked.parse(expandScripture(body.trim())),
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
