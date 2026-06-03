// Numbered footnotes for .astro pages. Create one collector per page in the
// frontmatter (`const fn = footnotes()`), add markers inline with <Fn>, and drop
// the list at the bottom with <FnList>. State is scoped to the collector, so it
// never leaks between pages. Numbers are for author footnotes; the lettered
// stream (a, b, c) is reserved for the USFM textual apparatus.

export interface FootnoteCollector {
  /** Record a note (HTML allowed) and return the inline superscript marker. */
  mark(noteHtml: string): string;
  /** Render the collected notes as a list (call once, after all markers). */
  list(title?: string): string;
}

export function footnotes(): FootnoteCollector {
  const notes: string[] = [];
  return {
    mark(noteHtml) {
      notes.push(noteHtml);
      const n = notes.length;
      return `<sup class="fn-ref"><a id="fnref-${n}" href="#fn-${n}">${n}</a></sup>`;
    },
    list(title = 'Notes') {
      if (!notes.length) return '';
      const items = notes
        .map((html, i) => {
          const n = i + 1;
          return `<li id="fn-${n}"><a class="tn-letter" href="#fnref-${n}">${n}</a> <span class="tn-body">${html}</span></li>`;
        })
        .join('');
      return `<section class="textual-notes"><div class="col-label">${title}</div><ul class="tn-list">${items}</ul></section>`;
    },
  };
}
