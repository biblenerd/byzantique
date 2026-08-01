// The shortcode registry: one declarative place that defines every author-facing
// shorthand a commentary note or book intro may use. The build pipeline drives its HTML
// from this list, and a future notes editor can read the same list to populate its insert
// menu, live preview, and validation. Adding a feature means adding one entry here rather
// than wiring an expander into the build by hand.
//
// Each entry carries:
//   name         short id, also the `kind:` used in `[text](kind:…)` shortcodes
//   title        human label (for an editor's insert menu)
//   description  one line on what it does
//   syntax       a copyable example
//   phase        'block'  runs first, may consume whole lines and emit trailing HTML
//                'inline' runs over the remaining Markdown string, in registry order
//   expand       (md, ctx) => md   the build-time transform
//
// Expansion order matches the historical pipeline exactly: footnotes are extracted first
// (block), then youtube, scripture, note, ref (inline), then Markdown is parsed and any
// block shortcode's trailing HTML (the footnote section) is appended.

import { marked } from 'marked';
import { scriptureQuote, refLink, refPreview } from './scripture.ts';
import { expandYouTube, youTubeId } from './media.ts';
import type { NoteEntry } from './notes.ts';

// Everything a shortcode's expander may need from its caller. All optional so book intros
// (which use only youtube + scripture) can pass a bare context.
export interface ShortcodeCtx {
  file?: string; // repo-relative path, used verbatim in build-failing error messages
  warn?: (msg: string) => void; // unresolved-but-tolerated notices (commentary warns; intros stay silent)
  appendHtml?: (html: string) => void; // block shortcodes emit trailing HTML through this
  // Resolve a `note:` target to a single note, or a sentinel for the two failure modes.
  resolveNote?: (id: string, book: string | null) => NoteEntry | 'ambiguous' | null;
}

export interface Shortcode {
  name: string;
  title: string;
  description: string;
  syntax: string;
  phase: 'block' | 'inline';
  pattern?: string; // regex source (no flags); the single source of truth for the syntax
  expand: (md: string, ctx: ShortcodeCtx) => string;
}

const attrEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --- youtube: `{{ youtube <id|url> }}` on its own line → responsive embed. Delegates to
// the shared media helper (which warns on an unresolved id, in every context). Must run
// before the scripture resolver so the include is not read as a reference. ---------------
const youtube: Shortcode = {
  name: 'youtube',
  title: 'YouTube video',
  description: 'Embed a YouTube video on its own line.',
  syntax: '{{ youtube https://youtu.be/VIDEOID }}',
  phase: 'inline',
  expand: (md) => expandYouTube(md),
};

// --- scripture: `{{ REF }}` on its own line → a quoted scripture blockquote. --------------
const SCRIPTURE_PATTERN = String.raw`^[ \t]*\{\{\s*([^}\n]+?)\s*\}\}[ \t]*$`;
const scripture: Shortcode = {
  name: 'scripture',
  title: 'Quote passage',
  description: 'Insert the full text of a passage as a blockquote, on its own line.',
  syntax: '{{ ROM 5:12 }}',
  phase: 'inline',
  pattern: SCRIPTURE_PATTERN,
  expand: (md, ctx) =>
    md.replace(new RegExp(SCRIPTURE_PATTERN, 'gm'), (m, refStr) => {
      const html = scriptureQuote(String(refStr).trim());
      if (!html) ctx.warn?.(`  ! unresolved scripture include: {{ ${String(refStr).trim()} }}`);
      return html ?? m;
    }),
};

// --- note: `[text](note:ID)` or `[text](note:CODE/ID)` → a link to that note's anchor.
// Unknown or ambiguous targets fail the build (REQUIREMENTS §5.7). -----------------------
const NOTE_PATTERN = String.raw`\[([^\]]+)\]\(note:([^)]+)\)`;
const note: Shortcode = {
  name: 'note',
  title: 'Link to a note',
  description: "Link to another commentary note by its id (qualify as CODE/id if ambiguous).",
  syntax: '[text](note:GEN_03_19-mortality)',
  phase: 'inline',
  pattern: NOTE_PATTERN,
  expand: (md, ctx) =>
    md.replace(new RegExp(NOTE_PATTERN, 'g'), (_, text, target) => {
      const t = String(target).trim();
      const slash = t.indexOf('/');
      const book = slash === -1 ? null : t.slice(0, slash).toUpperCase();
      const id = slash === -1 ? t : t.slice(slash + 1);
      const res = ctx.resolveNote?.(id, book) ?? null;
      if (res === null)
        throw new Error(`${ctx.file}: unresolved note reference [${text}](note:${t})`);
      if (res === 'ambiguous')
        throw new Error(
          `${ctx.file}: ambiguous note reference [${text}](note:${t}) — qualify as note:CODE/${id}`,
        );
      const base = `/${res.testament}/${res.slug}/`;
      const href = res.type === 'book' ? `${base}#note-${id}` : `${base}${res.sc}#note-${id}`;
      return `<a class="xref" href="${href}">${text}</a>`;
    }),
};

// --- ref: `[text](ref:JHN 1:1)` → an internal scripture link with a hover preview. An
// unresolved reference fails the build (REQUIREMENTS §5.7). -------------------------------
const REF_PATTERN = String.raw`\[([^\]]+)\]\(ref:([^)]+)\)`;
const ref: Shortcode = {
  name: 'ref',
  title: 'Cross-reference',
  description: 'Link to a scripture passage, with a hover preview of the first verse.',
  syntax: '[text](ref:ROM 6:23)',
  phase: 'inline',
  pattern: REF_PATTERN,
  expand: (md, ctx) =>
    md.replace(new RegExp(REF_PATTERN, 'g'), (_, text, r) => {
      const rr = String(r).trim();
      const link = refLink(rr);
      if (!link)
        throw new Error(`${ctx.file}: unresolved cross-reference [${text}](ref:${rr})`);
      const prev = refPreview(rr);
      const attr = prev ? ` data-ref-preview="${attrEsc(prev)}"` : '';
      return `<a class="xref" href="${link.href}"${attr}>${text}</a>`;
    }),
};

// --- footnote (block): `text[^id]` callers + `[^id]: …` definitions. Numbered in order of
// first reference; ids are namespaced per note so they never collide on a page. Definition
// bodies are themselves run through the note + ref inline shortcodes. The rendered footnote
// section is emitted through ctx.appendHtml so it lands after the note's Markdown body. ---
const footnote: Shortcode = {
  name: 'footnote',
  title: 'Footnote',
  description: 'Add a numbered footnote: a caller in the text and a definition below.',
  syntax: 'text[^src]\n\n[^src]: The reference.',
  phase: 'block',
  expand: (md, ctx) => {
    // Extract definitions line-by-line so indented continuation lines are consumed
    // (otherwise a 4-space wrap would be left behind and render as a code block).
    const lines = md.split('\n');
    const defs = new Map<string, string>();
    const kept: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\[\^([^\]\s]+)\]:[ \t]*(.*)$/);
      if (!m) {
        kept.push(lines[i]);
        continue;
      }
      let text = m[2];
      while (i + 1 < lines.length && /^(\s{2,}|\t)\S/.test(lines[i + 1])) {
        text += ' ' + lines[i + 1].trim();
        i++;
      }
      defs.set(m[1], text.trim());
    }
    md = kept.join('\n');
    if (!defs.size) return md;

    // The note id namespaces the footnote anchors; fall back to a stable string.
    const noteId = ctx.file ? ctx.file.replace(/^.*\//, '').replace(/\.md$/, '') : 'fn';

    const order: string[] = [];
    md = md.replace(/\[\^([^\]\s]+)\]/g, (m, id) => {
      if (!defs.has(id)) return m;
      let n = order.indexOf(id);
      if (n === -1) {
        order.push(id);
        n = order.length - 1;
      }
      const num = n + 1;
      return `<sup class="fn-ref"><a id="fnref-${noteId}-${num}" href="#fn-${noteId}-${num}">${num}</a></sup>`;
    });

    if (order.length) {
      const items = order
        .map((id, i) => {
          const num = i + 1;
          const body = marked.parseInline(expandInline(defs.get(id)!, ctx, ['note', 'ref']));
          return `<li id="fn-${noteId}-${num}"><a class="tn-letter" href="#fnref-${noteId}-${num}">${num}</a><span class="tn-body">${body}</span></li>`;
        })
        .join('');
      ctx.appendHtml?.(`<section class="note-fn ui"><ul class="tn-list">${items}</ul></section>`);
    }
    return md;
  },
};

// The registry. Order is the pipeline order: the block phase (footnote) runs first, then
// the inline phase in this sequence (youtube, scripture, note, ref).
export const SHORTCODES: Shortcode[] = [footnote, youtube, scripture, note, ref];

const BY_NAME = new Map(SHORTCODES.map((s) => [s.name, s]));

/** Run the named inline shortcodes over a Markdown string, in the order given. */
export function expandInline(md: string, ctx: ShortcodeCtx, names: string[]): string {
  for (const name of names) {
    const sc = BY_NAME.get(name);
    if (sc && sc.phase === 'inline') md = sc.expand(md, ctx);
  }
  return md;
}

/**
 * Render author Markdown (a commentary note or a book intro) to HTML through the shortcode
 * registry. `inline` selects which inline shortcodes apply (commentary uses all four; book
 * intros use only youtube + scripture). `footnotes` runs the block footnote phase first.
 */
export function renderAuthorHtml(
  md: string,
  ctx: ShortcodeCtx,
  opts: { footnotes?: boolean; inline?: string[] } = {},
): string {
  const inline = opts.inline ?? ['youtube', 'scripture', 'note', 'ref'];
  const appended: string[] = [];
  const c: ShortcodeCtx = { ...ctx, appendHtml: (h) => appended.push(h) };
  if (opts.footnotes) md = footnote.expand(md, c);
  md = expandInline(md, c, inline);
  return (marked.parse(md) as string) + appended.join('');
}

// One thing wrong with a reference in a note, located for an editor to underline.
export interface RefProblem {
  kind: 'ref' | 'note' | 'scripture' | 'youtube';
  severity: 'error' | 'warning';
  target: string; // the raw reference text
  text?: string; // the link text (for ref: and note:)
  index: number; // character offset in the body
  reason: string; // a human explanation
}

/**
 * Scan author Markdown and report EVERY unresolved reference at once, instead of throwing
 * on the first the way the build does. `ref:` and `note:` failures are errors (they fail
 * the build); unresolved `{{ }}` scripture and youtube includes are warnings (the build
 * only warns). The verdicts come from the same resolvers as expansion — refLink for ref:,
 * ctx.resolveNote for note:, scriptureQuote / youTubeId for `{{ }}` — so the editor's lint
 * and the build never disagree.
 */
export function validateReferences(body: string, ctx: ShortcodeCtx): RefProblem[] {
  const problems: RefProblem[] = [];

  for (const m of body.matchAll(new RegExp(REF_PATTERN, 'g'))) {
    const target = m[2].trim();
    if (!refLink(target))
      problems.push({
        kind: 'ref',
        severity: 'error',
        target,
        text: m[1],
        index: m.index ?? 0,
        reason: `Unresolved scripture reference "${target}".`,
      });
  }

  for (const m of body.matchAll(new RegExp(NOTE_PATTERN, 'g'))) {
    const target = m[2].trim();
    const slash = target.indexOf('/');
    const book = slash === -1 ? null : target.slice(0, slash).toUpperCase();
    const id = slash === -1 ? target : target.slice(slash + 1);
    const res = ctx.resolveNote?.(id, book) ?? null;
    if (res === null)
      problems.push({
        kind: 'note',
        severity: 'error',
        target,
        text: m[1],
        index: m.index ?? 0,
        reason: `No note with id "${id}"${book ? ` in ${book}` : ''}.`,
      });
    else if (res === 'ambiguous')
      problems.push({
        kind: 'note',
        severity: 'error',
        target,
        text: m[1],
        index: m.index ?? 0,
        reason: `Ambiguous note id "${id}" — qualify as CODE/${id}.`,
      });
  }

  // `{{ }}` lines are either a youtube embed or a scripture quote; the expander tries
  // youtube first, so branch the same way here.
  for (const m of body.matchAll(new RegExp(SCRIPTURE_PATTERN, 'gm'))) {
    const inner = m[1].trim();
    const yt = inner.match(/^(?:youtube|yt)\s+(.+)$/i);
    if (yt) {
      if (!youTubeId(yt[1]))
        problems.push({
          kind: 'youtube',
          severity: 'warning',
          target: inner,
          index: m.index ?? 0,
          reason: `Could not extract a YouTube id from "${yt[1].trim()}".`,
        });
    } else if (!scriptureQuote(inner)) {
      problems.push({
        kind: 'scripture',
        severity: 'warning',
        target: inner,
        index: m.index ?? 0,
        reason: `Unresolved scripture include "${inner}".`,
      });
    }
  }

  return problems.sort((a, b) => a.index - b.index);
}
