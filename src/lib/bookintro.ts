// Author book introductions, loaded + rendered at build time.
// One optional Markdown file per book: data/book-intros/<CODE>.md
// Supports the same `{{ ref }}` scripture-quote and `{{ youtube … }}` conventions as
// commentary notes.

import fs from 'node:fs';
import path from 'node:path';
import { renderAuthorHtml } from './shortcodes.ts';

const DIR = path.join(process.cwd(), 'data/book-intros');
const cache = new Map<string, string | null>();

/** Rendered HTML for a book's introduction, or null if there is no intro file. */
export function loadBookIntro(code: string): string | null {
  if (cache.has(code)) return cache.get(code)!;
  const file = path.join(DIR, `${code}.md`);
  let html: string | null = null;
  if (fs.existsSync(file)) {
    let md = fs.readFileSync(file, 'utf8');
    md = md.replace(/^---\n[\s\S]*?\n---\n/, ''); // drop optional frontmatter
    // Book intros support only the two `{{ }}` shorthands (scripture + youtube); no
    // cross-references, note links, or footnotes. Unresolved scripture stays silent.
    html = renderAuthorHtml(md.trim(), {}, { inline: ['youtube', 'scripture'] });
  }
  cache.set(code, html);
  return html;
}
