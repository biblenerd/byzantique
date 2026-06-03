// Author book introductions, loaded + rendered at build time.
// One optional Markdown file per book: data/book-intros/<CODE>.md
// Supports the same `{{ ref }}` scripture-quote convention as commentary notes.

import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { scriptureQuote } from './scripture.ts';

const DIR = path.join(process.cwd(), 'data/book-intros');
const cache = new Map<string, string | null>();

function expandScripture(md: string): string {
  return md.replace(/^[ \t]*\{\{\s*([^}\n]+?)\s*\}\}[ \t]*$/gm, (m, ref) => scriptureQuote(String(ref).trim()) ?? m);
}

/** Rendered HTML for a book's introduction, or null if there is no intro file. */
export function loadBookIntro(code: string): string | null {
  if (cache.has(code)) return cache.get(code)!;
  const file = path.join(DIR, `${code}.md`);
  let html: string | null = null;
  if (fs.existsSync(file)) {
    let md = fs.readFileSync(file, 'utf8');
    md = md.replace(/^---\n[\s\S]*?\n---\n/, ''); // drop optional frontmatter
    html = marked.parse(expandScripture(md.trim())) as string;
  }
  cache.set(code, html);
  return html;
}
