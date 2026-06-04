// Build-time loader for the generated lectionary chip index
// (public/data/lectionary/chips/<CODE>.json), keyed by chapter.

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'public/data/lectionary/chips');

export interface LectChip {
  occasion: string;
  source: string;
  ref: string;
  href: string;
  oid: string;
}

const cache = new Map<string, Record<string, LectChip[]>>();

/** Lectionary chips whose reading touches this chapter, ordered by reference. */
export function chipsForChapter(code: string, chapter: number): LectChip[] {
  let book = cache.get(code);
  if (!book) {
    const p = path.join(DIR, `${code}.json`);
    book = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
    cache.set(code, book);
  }
  return book[String(chapter)] ?? [];
}

export interface ChipGroup {
  ref: string;
  href: string;
  sv: number;
  occasions: string[];
}

/** Group a chapter's chips by reference (one passage read at several occasions →
 *  one chip), in passage order. Collapses "common of saints" repetition. */
export function chapterChipGroups(code: string, chapter: number): ChipGroup[] {
  const map = new Map<string, ChipGroup>();
  for (const c of chipsForChapter(code, chapter)) {
    let g = map.get(c.ref);
    if (!g) {
      const sv = Number(c.href.match(/#v(\d+)/)?.[1] ?? 1);
      map.set(c.ref, (g = { ref: c.ref, href: c.href, sv, occasions: [] }));
    }
    if (!g.occasions.includes(c.occasion)) g.occasions.push(c.occasion);
  }
  return [...map.values()].sort((a, b) => a.sv - b.sv);
}
