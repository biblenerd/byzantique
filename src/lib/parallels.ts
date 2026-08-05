// Build-time loader for the generated Gospel-parallels index (public/data/parallels/<CODE>.json).
// Produced by scripts/build-parallels.mjs from data/parallels/synopsis.json.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'public/data/parallels');

import type { VerseRange } from './texts';

export interface ParallelRef {
  code: string; // USFM code of the parallel Gospel (MAT/MRK/LUK/JHN)
  ref: string; // reference within that Gospel, e.g. "3:1-6"
  label: string; // full label, e.g. "Matthew 3:1-6"
  href: string; // link to the passage, e.g. "/nt/matthew/3#v1"
  from: VerseRange; // parsed verse span, for pulling the passage text
}

export interface ParallelEntry {
  id: number;
  title: string; // pericope title
  ref: string; // this Gospel's passage in the chapter, e.g. "1:2-6"
  from: { sc: number; sv: number; ec: number; ev: number };
  parallels: ParallelRef[]; // the SAME pericope in the OTHER Gospels
}

// Per-Gospel index, keyed by chapter number → its pericope entries.
const cache = new Map<string, Record<string, ParallelEntry[]>>();

function loadParallels(code: string): Record<string, ParallelEntry[]> {
  const hit = cache.get(code);
  if (hit) return hit;
  const p = path.join(DIR, `${code}.json`);
  const data: Record<string, ParallelEntry[]> = fs.existsSync(p)
    ? JSON.parse(fs.readFileSync(p, 'utf8'))
    : {};
  cache.set(code, data);
  return data;
}

/**
 * Synoptic parallels for the pericopes touching this chapter, with at least one parallel
 * in another Gospel. Empty for non-Gospel books and for chapters whose pericopes are
 * unique to this Gospel (e.g. much of John).
 */
export function parallelsForChapter(code: string, chapter: number): ParallelEntry[] {
  return (loadParallels(code)[String(chapter)] ?? []).filter((e) => e.parallels.length > 0);
}
