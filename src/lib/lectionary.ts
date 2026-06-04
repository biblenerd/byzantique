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

export interface Occasion {
  name: string;
  oid: string; // p<pdist> (movable/float) or md<month>-<day> (fixed) — for next-date click-through
}
export interface ChipGroup {
  ref: string;
  href: string;
  order: number; // start chapter*1000 + verse, so a reading beginning in an earlier chapter sorts first
  occasions: Occasion[];
}

/** Group a chapter's chips by reference (one passage read at several occasions →
 *  one chip), ordered by the reading's STARTING reference. A reading that begins
 *  in an earlier chapter (e.g. John 9:39–10:9 on the John 10 page) sorts first. */
export function chapterChipGroups(code: string, chapter: number): ChipGroup[] {
  const map = new Map<string, ChipGroup>();
  for (const c of chipsForChapter(code, chapter)) {
    let g = map.get(c.ref);
    if (!g) {
      const m = c.href.match(/\/(\d+)(?:#v(\d+))?$/); // /…/<chapter>[#v<verse>]
      const order = (m ? +m[1] : chapter) * 1000 + (m && m[2] ? +m[2] : 1);
      map.set(c.ref, (g = { ref: c.ref, href: c.href, order, occasions: [] }));
    }
    if (!g.occasions.some((o) => o.name === c.occasion)) g.occasions.push({ name: c.occasion, oid: c.oid });
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}
