// Build-time loader for generated commentary JSON (public/data/commentary/*).

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'public/data/commentary');

export interface NoteAnchor {
  book: string;
  sc: number;
  sv: number;
  ec: number;
  ev: number;
  type: 'verse' | 'range' | 'book' | string;
  ref: string;
}
export interface Note {
  id: string;
  title: string;
  tags: string[];
  anchor: NoteAnchor;
  span: number;
  html: string;
}

export function loadNotes(code: string): Note[] {
  const p = path.join(DIR, `${code}.json`);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Notes intersecting a chapter, ordered broad → narrow (REQUIREMENTS.md §5.2).
 *  Whole-book notes are excluded — they live on the book landing page. */
export function notesForChapter(code: string, chapter: number): Note[] {
  return loadNotes(code)
    .filter((n) => n.anchor.type !== 'book' && n.anchor.sc <= chapter && chapter <= n.anchor.ec)
    .sort((a, b) => b.span - a.span || a.anchor.sv - b.anchor.sv);
}

/** Whole-book notes (anchored to a bare book code), for the book landing page. */
export function bookNotes(code: string): Note[] {
  return loadNotes(code)
    .filter((n) => n.anchor.type === 'book')
    .sort((a, b) => a.anchor.sc - b.anchor.sc || a.anchor.sv - b.anchor.sv);
}

/** Verse/range portion of a reference, e.g. "1:1", "1", "1:1–13", "1:1–2:3". */
export function refRange(a: NoteAnchor): string {
  if (a.type === 'book') return '';
  if (a.ev === 999 && a.sc === a.ec) return `${a.sc}`; // whole chapter
  if (a.sc === a.ec) return a.sv === a.ev ? `${a.sc}:${a.sv}` : `${a.sc}:${a.sv}–${a.ev}`;
  return `${a.sc}:${a.sv}–${a.ec}:${a.ev}`;
}

export const anchorBadge = (type: string): string =>
  ({ verse: 'Verse', chapter: 'Chapter', range: 'Range', book: 'Book', pericope: 'Pericope' })[type] ?? type;

/**
 * Weighted commentary coverage for a book.
 * Per chapter: 0 notes → 0, exactly 1 note → 0.5, 2+ notes → 1.0.
 * fraction = sum of chapter weights ÷ total chapters.
 */
export function bookCoverage(code: string, totalChapters: number): { fraction: number; notes: number } {
  const notes = loadNotes(code);
  if (totalChapters <= 0) return { fraction: 0, notes: notes.length };

  const perChapter = new Array<number>(totalChapters + 1).fill(0);
  for (const n of notes) {
    if (n.anchor.type === 'book') continue; // whole-book notes don't count toward chapter coverage
    const lo = Math.max(1, n.anchor.sc);
    const hi = Math.min(totalChapters, n.anchor.ec);
    for (let c = lo; c <= hi; c++) perChapter[c]++;
  }

  let sum = 0;
  for (let c = 1; c <= totalChapters; c++) {
    sum += perChapter[c] === 0 ? 0 : perChapter[c] === 1 ? 0.5 : 1;
  }
  return { fraction: sum / totalChapters, notes: notes.length };
}
