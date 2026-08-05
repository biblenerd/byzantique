// Build-time Gospel-parallels pipeline: data/parallels/synopsis.json (pericopes with
// per-Gospel refs) → public/data/parallels/<CODE>.json (a verse→parallels index, keyed by
// book then chapter). Every reference is validated against the vendored text; a bad one is
// reported. Proof of concept — not yet wired into `npm run data` or any page.
//
//   node scripts/build-parallels.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { refLink } from '../src/lib/scripture.ts'; // validates a ref + yields href/label
import { bookByCode } from '../src/lib/canon.ts';
import { loadBook } from '../src/lib/texts.ts';

const GOSPELS = ['MAT', 'MRK', 'LUK', 'JHN'];

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data/parallels/synopsis.json');
const OUT = path.join(ROOT, 'public/data/parallels');

// Parse a book-relative "chapter:verse" ref (ranges + a trailing half-verse a/b) into a span.
function parseCV(cv) {
  const clean = String(cv).replace(/([0-9])[ab]\b/g, '$1').trim();
  const m = clean.match(/^(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const [, c1, v1, c2, v2] = m;
  const sc = +c1;
  const sv = +v1;
  let ec = sc;
  let ev = +v1;
  if (v2 && c2) { ec = +c2; ev = +v2; }
  else if (v2) { ev = +v2; }
  return { sc, sv, ec, ev, clean };
}

function build() {
  const { pericopes } = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const byBook = {}; // CODE → { chapter → [entry] }
  const coveredCh = {}; // CODE → Set(chapter touched by any ref)
  let refCount = 0;
  const unresolved = [];

  for (const p of pericopes) {
    // Resolve every gospel ref in this pericope up front (so each entry can list the others).
    const cols = [];
    for (const [code, cv] of Object.entries(p.refs)) {
      const span = parseCV(cv);
      const link = span ? refLink(`${code} ${span.clean}`) : null;
      if (!span || !link) {
        unresolved.push(`pericope ${p.id} (${p.title}): ${code} ${cv}`);
        continue;
      }
      refCount++;
      cols.push({ code, ref: cv, span, href: link.href, label: link.label });
      const chs = (coveredCh[code] ??= new Set());
      for (let c = span.sc; c <= span.ec; c++) chs.add(c);
    }

    // Invert: each gospel's passage gets an entry keyed by (book, chapter) listing the others.
    for (const c of cols) {
      const chap = ((byBook[c.code] ??= {})[c.span.sc] ??= []);
      chap.push({
        id: p.id,
        title: p.title,
        ref: c.ref,
        from: { sc: c.span.sc, sv: c.span.sv, ec: c.span.ec, ev: c.span.ev },
        parallels: cols
          .filter((o) => o.code !== c.code)
          .map((o) => ({ code: o.code, ref: o.ref, label: o.label, href: o.href })),
      });
    }
  }

  // Sort entries within a chapter by starting verse; write one file per book.
  const manifest = {};
  for (const code of Object.keys(byBook)) {
    for (const ch of Object.keys(byBook[code])) byBook[code][ch].sort((a, b) => a.from.sv - b.from.sv);
    fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify(byBook[code]));
    const meta = bookByCode(code);
    manifest[code] = { name: meta?.name ?? code, entries: Object.values(byBook[code]).reduce((n, a) => n + a.length, 0) };
    console.log(`  ✓ ${code} — ${manifest[code].entries} passage(s) with parallels`);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(
    `\nbuild-parallels: ${pericopes.length} pericope(s), ${refCount} validated ref(s) → public/data/parallels/`,
  );

  // QC: per-Gospel chapter coverage — every chapter of each Gospel should be touched.
  console.log('\n  coverage (chapters touched by ≥1 pericope):');
  for (const code of GOSPELS) {
    const total = loadBook(code)?.chapters.length ?? 0;
    const cov = coveredCh[code] ?? new Set();
    const missing = [];
    for (let c = 1; c <= total; c++) if (!cov.has(c)) missing.push(c);
    console.log(
      `    ${code} — ${cov.size}/${total} chapters` + (missing.length ? `  ⚠ missing: ${missing.join(', ')}` : '  ✓'),
    );
  }

  if (unresolved.length) {
    console.warn(`\n  ✗ ${unresolved.length} unresolved ref(s):`);
    for (const u of unresolved) console.warn(`    - ${u}`);
    process.exitCode = 1;
  }
}

build();
