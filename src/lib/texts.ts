// Build-time loader for the generated text JSON (public/data/texts/*).
// Read with fs during static generation; the same files are also served at
// /data/texts/<CODE>.json for client-side features (REQUIREMENTS.md §9).

import fs from 'node:fs';
import path from 'node:path';

const TEXTS_DIR = path.join(process.cwd(), 'public/data/texts');

/** A verse marker within a block. */
export interface VerseSeg {
  v: string; // verse label (e.g. "1", "1-2")
  n: number; // numeric start verse (for #v anchors)
}
/** A run of text within a block. */
export interface TextSeg {
  t: string;
}
/** A textual-note (USFM \f) marker, pointing into the chapter's footnotes. */
export interface FootnoteSeg {
  f: number;
}
export type Segment = VerseSeg | TextSeg | FootnoteSeg;
export const isVerse = (s: Segment): s is VerseSeg => 'v' in s;
export const isFootnote = (s: Segment): s is FootnoteSeg => 'f' in s;

/** A textual note (from the USFM apparatus). */
export interface Footnote {
  ref: string; // origin reference, e.g. "1:6"
  html: string; // rendered note body
}

export interface Block {
  kind: 'p' | 'q' | 'd' | 'b'; // prose paragraph | poetry line | title | stanza break
  level?: number; // poetry indent level (1–4)
  segments?: Segment[];
}
export interface Chapter {
  number: number;
  blocks: Block[];
  footnotes?: Footnote[]; // textual notes (lettered stream)
}

/** Lettered marker for a textual note: 0→a, 25→z, 26→aa, … */
export function letter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    n--;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
export interface BookText {
  code: string;
  name: string;
  chapters: Chapter[];
}
export interface ManifestEntry {
  code: string;
  name: string;
  chapters: number;
  verses: number;
}

export function loadManifest(): ManifestEntry[] {
  const p = path.join(TEXTS_DIR, 'manifest.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function builtCodes(): Set<string> {
  return new Set(loadManifest().map((m) => m.code));
}

export function loadBook(code: string): BookText | null {
  const p = path.join(TEXTS_DIR, `${code}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export interface Intro {
  title: string;
  html: string;
}
export function loadIntro(name: string): Intro | null {
  const p = path.join(process.cwd(), 'public/data/intro', `${name}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
