// Build-time converter for translation introductions (USFM intro markers → HTML).
// Phase 1: the TCENT introduction (data/intro/engtcent.usfm).
// Output: public/data/intro/<name>.json  →  { title, html }

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data/intro');
const OUT = path.join(ROOT, 'public/data/intro');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const letter = (i) => {
  let s = '', n = i + 1;
  while (n > 0) { n--; s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};

function footnoteBody(body) {
  let c = esc(body.replace(/^[+\-?*"]\s*/, ''));
  c = c.replace(/\\\+?(it|bk|em)\b\s*([\s\S]*?)\\\+?\1\*/g, '<em>$2</em>');
  c = c.replace(/\\\+?([a-z]+)\d*\b\s*([\s\S]*?)\\\+?\1\d*\*/g, '$2');
  c = c.replace(/\\fr\s+\S+\s*/, ''); // intro footnote refs are "1:0" — drop
  c = c.replace(/\\(ft|fq|fqa|fk)\b\s*/g, ' ');
  return c.replace(/\\\+?[a-z]+\d*\*?/gi, '').replace(/\s+/g, ' ').trim();
}

function inlineHtml(s, footnotes) {
  let t = esc(s);
  t = t.replace(/\\f\s+(.*?)\\f\*/gs, (_, body) => {
    footnotes.push(footnoteBody(body));
    const L = letter(footnotes.length - 1);
    return `<sup class="fn-ref"><a id="fnref-${L}" href="#fn-${L}">${L}</a></sup>`;
  });
  t = t.replace(/\\\+?(it|bk|em)\b\s*([\s\S]*?)\\\+?\1\*/g, '<em>$2</em>');
  t = t.replace(/\\\+?sup\b\s*([\s\S]*?)\\\+?sup\*/g, '<sup>$1</sup>');
  t = t.replace(/\\\+?([a-z]+)\d*\b\s*([\s\S]*?)\\\+?\1\d*\*/g, '$2');
  t = t.replace(/\\\+?[a-z]+\d*\*?/gi, '');
  return t.replace(/\s+/g, ' ').trim();
}

function convert(usfm) {
  const out = [];
  const footnotes = [];
  let title = 'Introduction';
  let table = null; // array of {c1, c2}

  const flushTable = () => {
    if (!table) return;
    const rows = table
      .map((r) => `<tr><th>${r.c1 ?? ''}</th><td>${r.c2 ?? ''}</td></tr>`)
      .join('');
    out.push(`<table class="sigla"><tbody>${rows}</tbody></table>`);
    table = null;
  };

  for (const raw of usfm.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^\\(\+?[a-z]+\d*)\*?\s?([\s\S]*)$/i);
    const marker = m ? m[1] : null;
    const rest = m ? m[2] : line;

    if (marker === 'tr') { if (!table) table = []; table.push({}); continue; }
    if (marker === 'tc1' || marker === 'th1') { if (table?.length) table.at(-1).c1 = inlineHtml(rest, footnotes); continue; }
    if (marker === 'tc2' || marker === 'th2') { if (table?.length) table.at(-1).c2 = inlineHtml(rest, footnotes); continue; }
    if (table) flushTable();

    if (marker === 'h') { title = rest.trim().replace(/^\w/, (c) => c.toUpperCase()); continue; }
    if (/^(id|ide|toc\d?|rem|sts|usfm|cl|ib|ie)$/.test(marker || '')) continue;
    if (marker === 'mt1' || marker === 'mt' || marker === 'mt2') {
      if (rest.trim()) title = rest.trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
      continue; // the page supplies its own heading
    }
    if (marker === 'is1' || marker === 'is') { out.push(`<h2>${inlineHtml(rest, footnotes)}</h2>`); continue; }
    if (marker === 'is2') { out.push(`<h3>${inlineHtml(rest, footnotes)}</h3>`); continue; }
    if (marker === 'imi' || marker === 'ipi' || marker === 'iq' || marker === 'iq1' || marker === 'iq2') {
      out.push(`<p class="eg">${inlineHtml(rest, footnotes)}</p>`);
      continue;
    }
    // ip, im, imt fallthrough and any other intro text → paragraph
    out.push(`<p>${inlineHtml(rest, footnotes)}</p>`);
  }
  flushTable();

  if (footnotes.length) {
    const items = footnotes
      .map((fn, i) => `<li id="fn-${letter(i)}"><a class="tn-letter" href="#fnref-${letter(i)}">${letter(i)}</a> <span>${fn}</span></li>`)
      .join('');
    out.push(`<section class="textual-notes"><div class="col-label">Notes</div><ul class="tn-list">${items}</ul></section>`);
  }

  return { title, html: out.join('\n') };
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  if (!fs.existsSync(SRC)) { console.log('build-intro: no data/intro/'); return; }
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.usfm'))) {
    const name = path.basename(file, '.usfm');
    const intro = convert(fs.readFileSync(path.join(SRC, file), 'utf8'));
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(intro));
    console.log(`  ✓ ${name} — "${intro.title}" (${intro.html.length} chars)`);
    n++;
  }
  console.log(`\nbuild-intro: ${n} intro(s) → public/data/intro/`);
}

build();
