// Build-time assembly of the synopsis comparison columns for a pericope: the chapter's own
// passage plus each parallel Gospel, each with its verse text and a count of the commentary
// notes that cover it. Feeds the comparison modal launched from the Synoptic parallels panel.
import { bookByCode } from './canon';
import { passageText, type PassageVerse, type VerseRange } from './texts';
import { notesInRange } from './commentary';
import type { ParallelEntry } from './parallels';

export interface SynopsisColumn {
  code: string; // USFM code
  name: string; // Gospel name (Matthew/Mark/Luke/John)
  ref: string; // reference within that Gospel, e.g. "3:1-6"
  href: string; // link to the passage (chapter page, verse anchor)
  self: boolean; // true for the chapter the reader is on
  verses: PassageVerse[]; // the passage text, one entry per verse
  notes: number; // authored notes overlapping the passage (for the ✎ badge)
}

const selfHref = (code: string, from: VerseRange): string => {
  const b = bookByCode(code);
  return b ? `/${b.testament}/${b.slug}/${from.sc}#v${from.sv}` : '#';
};

/** Columns for a pericope: the chapter's own passage first, then each parallel Gospel. */
export function synopsisColumns(selfCode: string, entry: ParallelEntry): SynopsisColumn[] {
  const col = (code: string, ref: string, href: string, from: VerseRange, self: boolean): SynopsisColumn => ({
    code,
    name: bookByCode(code)?.name ?? code,
    ref,
    href,
    self,
    verses: passageText(code, from),
    notes: notesInRange(code, from),
  });
  return [
    col(selfCode, entry.ref, selfHref(selfCode, entry.from), entry.from, true),
    ...entry.parallels.map((p) => col(p.code, p.ref, p.href, p.from, false)),
  ];
}
