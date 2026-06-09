// Shared scripture-inclusion resolver: a reference → a scripture blockquote (HTML).
// Used by both the commentary Markdown pipeline ({{ ref }}) and the <Scripture>
// Astro component (<Scripture ref="…" />). One source of truth.

import { loadBook, isVerse, inlineHtml, inlinePlain, type BookText, type Segment } from './texts.ts';
import { bookByCode, bookLabel } from './canon.ts';

export const WHOLE_CHAPTER_END = 999;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface ScriptureRef {
  book: string;
  sc: number;
  sv: number;
  ec: number;
  ev: number;
}

/** Parse "JHN 1:1", "GEN 1:1-3", "GEN 1:1-2:3", "GEN 1" (whole chapter). */
export function parseRef(str: string): ScriptureRef | null {
  const m = String(str)
    .trim()
    .match(/^([0-9A-Za-z]+)\s+(\d+)(?::(\d+))?(?:[-–](?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const [, book, c1, v1, c2, v2] = m;
  const sc = +c1;
  const sv = v1 ? +v1 : 1;
  let ec = sc;
  let ev = v1 ? +v1 : WHOLE_CHAPTER_END;
  if (v2 && c2) {
    ec = +c2;
    ev = +v2;
  } else if (v2) {
    ec = sc;
    ev = +v2;
  }
  return { book: book.toUpperCase(), sc, sv, ec, ev };
}

const inPassage = (ch: number, v: number, r: ScriptureRef): boolean =>
  (ch > r.sc || v >= r.sv) && (ch < r.ec || v <= r.ev);

interface QBlock {
  kind: string;
  level?: number;
  segments?: Segment[];
}

/** Extract a reference range as blocks (paragraphs / poetry lines / stanza breaks),
 *  preserving structure. Footnote callers are omitted from quotes. */
function getPassageBlocks(
  book: BookText,
  r: ScriptureRef,
): { blocks: QBlock[]; first?: { ch: number; n: number }; last?: { ch: number; n: number } } {
  const blocks: QBlock[] = [];
  let curVerse = 0;
  let first: { ch: number; n: number } | undefined;
  let last: { ch: number; n: number } | undefined;

  for (const ch of book.chapters) {
    if (ch.number < r.sc || ch.number > r.ec) continue;
    for (const bl of ch.blocks) {
      if (bl.kind === 'b') {
        blocks.push({ kind: 'b' });
        continue;
      }
      const segs: Segment[] = [];
      for (const s of bl.segments ?? []) {
        if (isVerse(s)) {
          curVerse = s.n;
          if (inPassage(ch.number, curVerse, r)) {
            segs.push(s);
            if (!first) first = { ch: ch.number, n: s.n };
            last = { ch: ch.number, n: s.n };
          }
        } else if ('t' in s && inPassage(ch.number, curVerse, r)) {
          segs.push(s);
        }
      }
      if (segs.length) blocks.push({ kind: bl.kind, level: bl.level, segments: segs });
    }
  }

  // trim leading/trailing/duplicate stanza breaks
  while (blocks.length && blocks[0].kind === 'b') blocks.shift();
  while (blocks.length && blocks.at(-1)?.kind === 'b') blocks.pop();
  const pruned: QBlock[] = [];
  for (const b of blocks) {
    if (b.kind === 'b' && pruned.at(-1)?.kind === 'b') continue;
    pruned.push(b);
  }
  return { blocks: pruned, first, last };
}

const blockClass = (b: QBlock): string =>
  b.kind === 'q' ? `poetry q${b.level ?? 1}` : b.kind === 'd' ? 'psalm-title' : '';

function blocksToHtml(blocks: QBlock[], showNums: boolean): string {
  let html = '';
  for (const b of blocks) {
    if (b.kind === 'b') {
      html += '<div class="stanza"></div>';
      continue;
    }
    const inner = (b.segments ?? [])
      .map((s) => {
        if (isVerse(s)) return showNums ? `<span class="vn">${esc(s.v)}</span>` : '';
        if ('t' in s) return `${inlineHtml(s.t)} `;
        return '';
      })
      .join('')
      .trim();
    if (!inner) continue;
    const cls = blockClass(b);
    html += `<p${cls ? ` class="${cls}"` : ''}>${inner}</p>`;
  }
  return html;
}

/** Resolve a reference to a link target + display label (for inline citations).
 *  A bare book code (e.g. "GEN") links to the book landing page. */
export function refLink(refStr: string): { href: string; label: string } | null {
  const s = String(refStr).trim();
  if (/^[0-9A-Za-z]+$/.test(s)) {
    const meta = bookByCode(s.toUpperCase());
    return meta ? { href: `/${meta.testament}/${meta.slug}/`, label: bookLabel(meta) } : null;
  }
  const r = parseRef(s);
  if (!r) return null;
  const meta = bookByCode(r.book);
  if (!meta) return null;
  const whole = r.ev === WHOLE_CHAPTER_END && r.sv === 1 && r.sc === r.ec;
  let range: string;
  if (whole) range = `${r.sc}`;
  else if (r.sc === r.ec) range = r.sv === r.ev ? `${r.sc}:${r.sv}` : `${r.sc}:${r.sv}–${r.ev}`;
  else range = `${r.sc}:${r.sv}–${r.ec}:${r.ev}`;
  const href = `/${meta.testament}/${meta.slug}/${r.sc}${whole ? '' : `#v${r.sv}`}`;
  return { href, label: `${bookLabel(meta)} ${range}` };
}

/** First-verse plain text for a reference (hover preview, Option 1), truncated. */
export function refPreview(refStr: string, max = 180): string | null {
  const r = parseRef(String(refStr).trim());
  if (!r) return null; // bare-book refs have no single-verse preview
  const book = loadBook(r.book);
  if (!book) return null;
  let started = false;
  let txt = '';
  for (const ch of book.chapters) {
    if (ch.number < r.sc || ch.number > r.ec) continue;
    for (const bl of ch.blocks) {
      for (const seg of bl.segments ?? []) {
        if (isVerse(seg)) {
          if (started) {
            const out = txt.trim();
            return out.length > max ? out.slice(0, max).replace(/\s+\S*$/, '') + '…' : out;
          }
          if (inPassage(ch.number, seg.n, r)) started = true;
        } else if (started && 't' in seg) {
          txt += inlinePlain(seg.t) + ' ';
        }
      }
    }
  }
  const out = txt.trim();
  if (!out) return null;
  return out.length > max ? out.slice(0, max).replace(/\s+\S*$/, '') + '…' : out;
}

/** Resolve a reference to a scripture blockquote (HTML string), or null. */
export function scriptureQuote(refStr: string): string | null {
  const ref = parseRef(refStr);
  if (!ref) return null;
  const book = loadBook(ref.book);
  const meta = bookByCode(ref.book);
  if (!book || !meta) return null;
  const { blocks, first, last } = getPassageBlocks(book, ref);
  if (!first || !last || !blocks.length) return null;

  let verseCount = 0;
  for (const b of blocks) for (const s of b.segments ?? []) if (isVerse(s)) verseCount++;
  const body = blocksToHtml(blocks, verseCount > 1);

  const range =
    first.ch === last.ch
      ? first.n === last.n
        ? `${first.ch}:${first.n}`
        : `${first.ch}:${first.n}–${last.n}`
      : `${first.ch}:${first.n}–${last.ch}:${last.n}`;
  const href = `/${meta.testament}/${meta.slug}/${first.ch}#v${first.n}`;
  const cite = `${esc(bookLabel(meta))} ${range}`;

  return `<blockquote class="scripture-quote">${body}<cite><a href="${href}">${cite}</a></cite></blockquote>`;
}

/** Resolve a reference to a full passage rendered like the main reader text (not the
 *  compact quote box), plus a link + label for a clickable reference header. For embedding
 *  scripture inline in prayers. Returns null if the reference can't be resolved. */
export function scripturePassage(refStr: string): { body: string; href: string; label: string } | null {
  const ref = parseRef(refStr);
  if (!ref) return null;
  const book = loadBook(ref.book);
  const link = refLink(refStr);
  if (!book || !link) return null;
  const { blocks } = getPassageBlocks(book, ref);
  if (!blocks.length) return null;

  let verseCount = 0;
  for (const b of blocks) for (const s of b.segments ?? []) if (isVerse(s)) verseCount++;
  return { body: blocksToHtml(blocks, verseCount > 1), href: link.href, label: link.label };
}
