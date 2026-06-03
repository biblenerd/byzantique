// Author-defined pericope (section) titles, loaded at build time.
// A pericope file is optional, per book: data/pericopes/<CODE>.json
//   [ { "start": "C:V", "title": "…" }, … ]
// `start` is the book-relative chapter:verse where the section begins. The title
// renders as a section heading before that verse and TAKES PRECEDENCE over any
// USFM \s heading at the same place (REQUIREMENTS §5.3: author titles, fallback
// to USFM \s where no author pericope).

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data/pericopes');

export interface Pericope {
  sc: number; // start chapter
  sv: number; // start verse
  title: string;
}

const cache = new Map<string, Pericope[]>();

export function loadPericopes(code: string): Pericope[] {
  const hit = cache.get(code);
  if (hit) return hit;
  const file = path.join(DIR, `${code}.json`);
  let out: Pericope[] = [];
  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { start: string; title: string }[];
    out = raw
      .map((r) => {
        const [c, v] = String(r.start).split(':').map((n) => parseInt(n, 10));
        return { sc: c, sv: v || 1, title: r.title };
      })
      .filter((p) => p.sc && p.title);
  }
  cache.set(code, out);
  return out;
}
