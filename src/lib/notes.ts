// The note corpus: how commentary note files on disk map to anchors, ids, and one another.
// Shared by the build (build-commentary.mjs) and, later, the studio editor, so both agree
// on what an anchor means and which note an id resolves to. One source of truth for the
// file-walk, frontmatter parse, anchor grammar, and the note id registry.

import fs from 'node:fs';
import path from 'node:path';
import { bookByCode } from './canon.ts';
import { WHOLE_CHAPTER_END } from './scripture.ts';

export interface Anchor {
  book: string;
  sc: number;
  sv: number;
  ec: number;
  ev: number;
  scope?: 'book';
}

// One indexed note: its id (filename without .md) and the anchor it is attached to.
export interface NoteEntry {
  id: string;
  book: string;
  testament: string;
  slug: string;
  type: string; // 'book' | 'chapter' | 'range' | 'verse'
  sc: number;
  sv: number;
}

// Parse a note's `anchor`: "GEN" (whole book), "GEN 1" (whole chapter), "GEN 1:1",
// "GEN 1:1-13", "GEN 1:1-2:3". A superset of scripture.ts's parseRef: it adds the bare
// book-code case (scope: 'book'), which a note anchor allows but a scripture ref does not.
export function parseAnchor(str: string): Anchor | null {
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
  let ec = sc;
  let ev = v1 ? +v1 : WHOLE_CHAPTER_END;
  if (v2 && c2) {
    ec = +c2;
    ev = +v2;
  } else if (v2) {
    ec = sc;
    ev = +v2;
  }
  return { book: book.toUpperCase(), sc, sv, ec, ev };
}

// Classify an anchor: whole book, whole chapter, single verse, or a range.
export function anchorType(a: Anchor): string {
  if (a.scope === 'book') return 'book';
  if (a.ev === WHOLE_CHAPTER_END) return a.sc === a.ec ? 'chapter' : 'range';
  if (a.sc !== a.ec) return 'range';
  return a.sv === a.ev ? 'verse' : 'range';
}

// Split `---` frontmatter (a flat key: value block) from the Markdown body.
export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    data[key] = val;
  }
  return { data, body: m[2] };
}

// Every .md file under a directory, recursively.
export function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMarkdown(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// Index every note in a commentary tree by its id (the filename without .md). One id can
// map to more than one entry (the same slug filed under two books), which is why a note:
// cross-reference may need a CODE/ qualifier. This mirrors the build's first pass exactly.
export function buildNoteRegistry(srcDir: string): Map<string, NoteEntry[]> {
  const registry = new Map<string, NoteEntry[]>();
  for (const file of walkMarkdown(srcDir)) {
    const { data } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (!data.anchor) continue;
    const a = parseAnchor(data.anchor);
    if (!a) continue;
    const meta = bookByCode(a.book);
    if (!meta) continue;
    const id = path.basename(file, '.md');
    const entry: NoteEntry = {
      id,
      book: a.book,
      testament: meta.testament,
      slug: meta.slug,
      type: anchorType(a),
      sc: a.sc,
      sv: a.sv,
    };
    if (!registry.has(id)) registry.set(id, []);
    registry.get(id)!.push(entry);
  }
  return registry;
}

// Resolve a note: target against a registry. Returns the single matching entry, the
// sentinel 'ambiguous' when more than one matches, or null when none do. This is the
// verdict the build turns into a link or a build-failing error, and the studio turns into
// a live lint underline.
export function resolveNoteRef(
  registry: Map<string, NoteEntry[]>,
  id: string,
  book: string | null,
): NoteEntry | 'ambiguous' | null {
  let matches = registry.get(id) ?? [];
  if (book) matches = matches.filter((m) => m.book === book);
  if (matches.length === 0) return null;
  if (matches.length > 1) return 'ambiguous';
  return matches[0];
}
