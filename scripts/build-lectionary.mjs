// Build-time lectionary pipeline: orthocal-python's calendarium fixture →
// the `passage → occasions` inverted index that drives chapter-page chips.
// (REQUIREMENTS §4.) Run with --experimental-strip-types (imports canon.ts).
//
// A reading is chipped only when its day qualifies: feast_level ≥ 5 OR a non-empty
// (movable) title. Occasions are year-independent (keyed by pdist / month-day), so
// this needs no Paschalion — that is only for date → occasion ("today"), built later.
//
// Output  public/data/lectionary/chips/<CODE>.json:
//   { "<chapter>": [ { occasion, source, ref, href, oid } ] }

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { bookByCode, bookLabel } from '../src/lib/canon.ts';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'data/lectionary/calendarium.json');
const DATES_IN = path.join(ROOT, 'data/lectionary/dates'); // orthocal-engine dump (vendored)
const OUT = path.join(ROOT, 'public/data/lectionary/chips');
const YEAR_OUT = path.join(ROOT, 'public/data/lectionary/year');
const WHOLE = 999;

// orthocal sdisplay book abbreviation → USFM code
const BOOK = {
  Matt: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Rom: 'ROM',
  '1 Cor': '1CO', '2 Cor': '2CO', Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL',
  '1 Thess': '1TH', '2 Thess': '2TH', '1 Tim': '1TI', '2 Tim': '2TI', Titus: 'TIT',
  Philemon: 'PHM', Heb: 'HEB', Jas: 'JAS', '1 Pet': '1PE', '1 Peter': '1PE', '2 Pet': '2PE',
  '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', Jude: 'JUD',
  Gen: 'GEN', Exod: 'EXO', Lev: 'LEV', Num: 'NUM', Deut: 'DEU', Josh: 'JOS', Judges: 'JDG',
  '3 Kgs': '1KI', '4 Kgs': '2KI', Job: 'JOB', Prov: 'PRO', Wis: 'WIS', Isa: 'ISA',
  Jer: 'JER', Baruch: 'BAR', Ezek: 'EZK', Ezekiel: 'EZK', Daniel: 'DAN', Joel: 'JOL',
  Jonah: 'JON', Amos: 'AMO', Micah: 'MIC', Zech: 'ZEC', Zeph: 'ZEP',
  Malachi: 'MAL', Hosea: 'HOS', Habakkuk: 'HAB', Nahum: 'NAM', Haggai: 'HAG',
  Obadiah: 'OBA', Lam: 'LAM', Hab: 'HAB', Hos: 'HOS', Mal: 'MAL',
};

// Parse an orthocal reference string into flat ranges.
// Handles "Matt 1.1-25", "Matt 4.25-5.13", and composites with `;` (book change)
// and `,` (continuation): "Gen 17.1-2, 4, 5-7", "Prov 10; Wis 6, 7, 8, 9".
function parseRef(sdisplay) {
  const out = [];
  let code = null, chap = null, sawVerse = false;
  // normalize: drop "(LXX)"-style annotations; some refs use ':' for chapter:verse
  const clean = String(sdisplay).replace(/\([^)]*\)/g, '').replace(/:/g, '.');
  for (let chunk of clean.split(';')) {
    chunk = chunk.trim();
    if (!chunk) continue;
    // "Song of the Three" (Prayer of Azariah + Song) is Daniel 3 in the LXX:
    // its verse 1 = Daniel 3:24, so apply a +23 offset.
    const sm = chunk.match(/^Song of the Three\s+(.+)$/i);
    if (sm) {
      for (let tok of sm[1].split(',')) {
        tok = tok.trim();
        let m;
        if ((m = tok.match(/^(\d+)-(\d+)$/))) out.push({ code: 'DAN', sc: 3, sv: +m[1] + 23, ec: 3, ev: +m[2] + 23 });
        else if ((m = tok.match(/^(\d+)$/))) out.push({ code: 'DAN', sc: 3, sv: +m[1] + 23, ec: 3, ev: +m[1] + 23 });
      }
      code = 'DAN';
      chap = 3;
      sawVerse = true;
      continue;
    }
    const bm = chunk.match(/^((?:[1-4]\s)?[A-Za-z]+)\s+(.+)$/);
    if (bm && BOOK[bm[1].trim()]) {
      code = BOOK[bm[1].trim()];
      chap = null;
      sawVerse = false;
      chunk = bm[2];
    }
    if (!code) continue;
    for (let tok of chunk.split(',')) {
      tok = tok.trim();
      let m;
      if ((m = tok.match(/^(\d+)\.(\d+)-(\d+)\.(\d+)$/))) {
        out.push({ code, sc: +m[1], sv: +m[2], ec: +m[3], ev: +m[4] }); chap = +m[3]; sawVerse = true;
      } else if ((m = tok.match(/^(\d+)\.(\d+)-(\d+)$/))) {
        out.push({ code, sc: +m[1], sv: +m[2], ec: +m[1], ev: +m[3] }); chap = +m[1]; sawVerse = true;
      } else if ((m = tok.match(/^(\d+)\.(\d+)$/))) {
        out.push({ code, sc: +m[1], sv: +m[2], ec: +m[1], ev: +m[2] }); chap = +m[1]; sawVerse = true;
      } else if ((m = tok.match(/^(\d+)-(\d+)$/))) {
        if (sawVerse && chap != null) out.push({ code, sc: chap, sv: +m[1], ec: chap, ev: +m[2] });
        else for (let c = +m[1]; c <= +m[2]; c++) out.push({ code, sc: c, sv: 1, ec: c, ev: WHOLE });
      } else if ((m = tok.match(/^(\d+)$/))) {
        if (sawVerse && chap != null) out.push({ code, sc: chap, sv: +m[1], ec: chap, ev: +m[1] });
        else out.push({ code, sc: +m[1], sv: 1, ec: +m[1], ev: WHOLE });
      }
    }
  }
  return out;
}

// Human reference label from parsed ranges, grouped by book (our canon names).
function refLabel(ranges) {
  const groups = [];
  for (const r of ranges) {
    let g = groups.find((x) => x.code === r.code);
    if (!g) groups.push((g = { code: r.code, ranges: [] }));
    g.ranges.push(r);
  }
  return groups
    .map((g) => {
      const meta = bookByCode(g.code);
      return `${meta ? bookLabel(meta) : g.code} ${mergeRanges(g.ranges).map(rangeStr).join(', ')}`;
    })
    .join('; ');
}

function build() {
  const data = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const pericope = new Map();
  const dayByPdist = new Map();
  const dayByMd = new Map();
  const readings = [];

  for (const row of data) {
    const f = row.fields;
    if (row.model === 'calendarium.pericope') pericope.set(row.pk, f);
    else if (row.model === 'calendarium.reading') readings.push(f);
    else if (row.model === 'calendarium.day') {
      const fullTitle = f.subtitle ? `${f.title}: ${f.subtitle}` : f.title;
      const rec = { feast_level: f.feast_level, feast_name: f.feast_name, title: fullTitle };
      if (f.pdist === 999) dayByMd.set(`${f.month}-${f.day}`, rec);
      else if (!dayByPdist.has(f.pdist) || f.feast_level > dayByPdist.get(f.pdist).feast_level)
        dayByPdist.set(f.pdist, rec);
    }
  }

  // chips[CODE][chapter] = [ {occasion, source, ref, href, oid} ]
  const chips = {};
  let chipCount = 0;
  const unresolved = new Set();

  for (const r of readings) {
    const day = r.pdist === 999 ? dayByMd.get(`${r.month}-${r.day}`) : dayByPdist.get(r.pdist);
    if (!day) continue;
    const titled = day.title && day.title.trim();
    const feast = day.feast_level >= 5;
    if (!feast && !titled) continue; // ordinary day → no chip

    const occasion = feast && day.feast_name && day.feast_name.trim() ? day.feast_name : day.title;
    const oid = r.pdist === 999 ? `md${r.month}-${r.day}` : `p${r.pdist}`;
    const per = pericope.get(r.pericope);
    if (!per) continue;
    const ranges = parseRef(per.sdisplay);
    if (!ranges.length) { unresolved.add(per.sdisplay); continue; }

    const ref = refLabel(ranges);
    if (!bookByCode(ranges[0].code)) { unresolved.add(per.sdisplay); continue; }

    // Place the chip on every (book, chapter) the reading touches, each linking to
    // THAT chapter (a composite spanning books links to its own chapter on each page).
    const seen = new Set();
    for (const rg of ranges) {
      const meta = bookByCode(rg.code);
      if (!meta) continue;
      for (let c = rg.sc; c <= rg.ec; c++) {
        const key = `${rg.code}|${c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const whole = rg.ev === WHOLE && rg.sc === rg.ec;
        const v = c === rg.sc ? rg.sv : 1;
        const href = `/${meta.testament}/${meta.slug}/${c}${whole ? '' : `#v${v}`}`;
        (chips[rg.code] ??= {});
        const arr = (chips[rg.code][c] ??= []);
        const dupe = arr.some((e) => e.oid === oid && e.ref === ref);
        if (!dupe) { arr.push({ occasion, source: r.source, ref, href, oid }); chipCount++; }
      }
    }
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  let books = 0;
  for (const [code, byChapter] of Object.entries(chips)) {
    for (const arr of Object.values(byChapter)) arr.sort((a, b) => a.ref.localeCompare(b.ref));
    fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify(byChapter));
    books++;
  }

  console.log(`build-lectionary: ${chipCount} chips across ${books} books → public/data/lectionary/chips/`);
  if (unresolved.size) console.warn(`  ! ${unresolved.size} unresolved refs: ${[...unresolved].slice(0, 5).join(' | ')}`);

  buildDateReadings(dayByMd);
}

// Merge contiguous ranges within one book (e.g. Daniel 3:1-23 + 3:24-89 → 3:1-89).
function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a.sc - b.sc || a.sv - b.sv);
  const out = [];
  for (const r of sorted) {
    const last = out.at(-1);
    if (last && last.ev !== WHOLE && last.ec === r.sc && r.sv === last.ev + 1) {
      last.ec = r.ec;
      last.ev = r.ev;
    } else out.push({ ...r });
  }
  return out;
}

const rangeStr = (r) =>
  r.ev === WHOLE
    ? `${r.sc}`
    : r.sc === r.ec
      ? r.sv === r.ev
        ? `${r.sc}:${r.sv}`
        : `${r.sc}:${r.sv}-${r.ev}`
      : `${r.sc}:${r.sv}-${r.ec}:${r.ev}`;

// Resolve one orthocal reading to a list of per-book parts, each with its own link
// (a composite spanning books — e.g. "1 Cor 5.6-8; Gal 3.13-14" — links each book
// separately while staying grouped on display).
function resolveReadingParts(rd) {
  const ranges = parseRef(rd.ref);
  if (!ranges.length) return { source: rd.source, parts: [{ label: rd.ref, href: null }] };
  const groups = [];
  for (const r of ranges) {
    let g = groups.find((x) => x.code === r.code);
    if (!g) groups.push((g = { code: r.code, ranges: [] }));
    g.ranges.push(r);
  }
  const parts = groups.map((g) => {
    g.ranges = mergeRanges(g.ranges);
    const meta = bookByCode(g.code);
    const label = `${meta ? bookLabel(meta) : g.code} ${g.ranges.map(rangeStr).join(', ')}`;
    const first = g.ranges[0];
    const href = meta ? `/${meta.testament}/${meta.slug}/${first.sc}${first.ev === WHOLE ? '' : `#v${first.sv}`}` : null;
    return { label, href };
  });
  return { source: rd.source, parts };
}

// Transform the vendored orthocal-engine dump (data/lectionary/dates/<YEAR>.json)
// into served per-year files with our references/links.
function buildDateReadings(dayByMd) {
  if (!fs.existsSync(DATES_IN)) {
    console.warn('  ! no data/lectionary/dates/ — run scripts/dump-lectionary.py (today\'s readings skipped)');
    return;
  }
  fs.rmSync(YEAR_OUT, { recursive: true, force: true });
  fs.mkdirSync(YEAR_OUT, { recursive: true });
  const years = fs.readdirSync(DATES_IN).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => +f.slice(0, 4)).sort();
  const pascha = {}; // year → "MM-DD" of Orthodox Pascha (for movable-occasion click-through)
  for (const y of years) {
    const src = JSON.parse(fs.readFileSync(path.join(DATES_IN, `${y}.json`), 'utf8'));
    const out = {};
    for (const [md, rec] of Object.entries(src)) {
      // Surface a fixed great-feast name (stored on Day.feast_name, not in titles).
      const [mm, dd] = md.split('-').map(Number);
      const fixed = dayByMd.get(`${mm}-${dd}`);
      const titles = [...rec.titles];
      if (rec.feast_level >= 5 && fixed?.feast_name && !titles.includes(fixed.feast_name))
        titles.unshift(fixed.feast_name);
      if (rec.titles.includes('Holy Pascha')) pascha[y] = md;
      out[md] = {
        titles,
        feast_level: rec.feast_level,
        readings: rec.readings.map(resolveReadingParts),
      };
    }
    fs.writeFileSync(path.join(YEAR_OUT, `${y}.json`), JSON.stringify(out));
  }
  fs.writeFileSync(path.join(YEAR_OUT, '..', 'years.json'), JSON.stringify({ min: years[0], max: years.at(-1) }));
  fs.writeFileSync(path.join(YEAR_OUT, '..', 'pascha.json'), JSON.stringify(pascha));
  console.log(`build-lectionary: date readings for ${years[0]}–${years.at(-1)} → public/data/lectionary/year/`);
}

build();
