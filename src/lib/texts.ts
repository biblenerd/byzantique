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

// Italic/translator-addition runs are stored in text segments wrapped in a private-use
// sentinel pair (U+E000 … U+E001) by build-texts.mjs. Render them per context:
const SENT_OPEN = String.fromCharCode(0xe000);
const SENT_CLOSE = String.fromCharCode(0xe001);
const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Text-segment string → safe HTML, with sentinel runs rendered as <i>…</i>. */
export const inlineHtml = (t: string): string =>
  escHtml(t).split(SENT_OPEN).join('<i>').split(SENT_CLOSE).join('</i>');
/** Text-segment string → plain text (sentinels stripped), for previews/snippets. */
export const inlinePlain = (t: string): string =>
  t.split(SENT_OPEN).join('').split(SENT_CLOSE).join('');

/** A textual note (from the USFM apparatus). */
export interface Footnote {
  ref: string; // origin reference, e.g. "1:6"
  html: string; // rendered note body
}

export interface Block {
  kind: 'p' | 'q' | 'd' | 'b' | 's'; // prose | poetry line | Hebrew/Psalm title | stanza break | section heading
  level?: number; // poetry indent level (1–4), or section-heading level
  segments?: Segment[];
  text?: string; // section-heading text (kind 's')
  major?: boolean; // major section heading (\ms)
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

/** A verse-numbered range within a book, e.g. { sc:1, sv:2, ec:1, ev:6 }. */
export interface VerseRange {
  sc: number;
  sv: number;
  ec: number;
  ev: number;
}
/** One rendered verse of a passage. */
export interface PassageVerse {
  v: number; // verse number
  html: string; // inline HTML (italic runs preserved, footnote markers dropped)
}

const vkey = (c: number, v: number) => c * 1000 + v;

/**
 * The text of a verse range, one entry per verse, as inline HTML. Walks the book's block
 * model tracking the running verse number and collects the text segments that fall inside
 * [sc:sv … ec:ev]. Footnote markers are dropped; italic (translator-addition) runs are kept.
 * Used to render synopsis comparison columns at build time.
 */
export function passageText(code: string, range: VerseRange): PassageVerse[] {
  const book = loadBook(code);
  if (!book) return [];
  const lo = vkey(range.sc, range.sv);
  const hi = vkey(range.ec, range.ev);
  const order: number[] = [];
  const acc = new Map<number, string>();
  for (const chap of book.chapters) {
    if (chap.number < range.sc || chap.number > range.ec) continue;
    let cur: number | null = null;
    for (const blk of chap.blocks) {
      if (!blk.segments) continue;
      for (const seg of blk.segments) {
        if (isVerse(seg)) {
          cur = seg.n;
        } else if (!isFootnote(seg) && cur != null) {
          const k = vkey(chap.number, cur);
          if (k < lo || k > hi) continue;
          if (!acc.has(k)) {
            acc.set(k, '');
            order.push(k);
          }
          // Trailing space per segment mirrors ChapterText, so text reads correctly across
          // dropped footnote markers (e.g. "Jesus" + \f + "Christ" → "Jesus Christ").
          acc.set(k, acc.get(k)! + inlineHtml((seg as TextSeg).t) + ' ');
        }
      }
    }
  }
  return order.map((k) => ({ v: k % 1000, html: (acc.get(k) ?? '').replace(/\s+/g, ' ').trim() }));
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
