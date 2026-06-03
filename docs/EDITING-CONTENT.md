# Editing content (pages & commentary)

Byzantique has two kinds of editable content:

| | Lives in | Format | Use it for |
|---|---|---|---|
| **Pages** | `src/pages/**/*.astro` | Astro (HTML + components) | Home, About, Approach, License, Privacy, FAQs… |
| **Commentary** | `data/commentary/**/*.md` | Markdown + frontmatter | Notes anchored to a passage, shown on chapter pages |

Both share the same **scripture reference grammar**: a USFM book code + chapter:verse
(`JHN 5:39-40`, `2CO 3`, `GEN 1:1-2:3`). Book codes are in
[`USFM-BOOK-NAMES.md`](./USFM-BOOK-NAMES.md). After any edit, run `npm run dev` (or
`npm run build`) to see it — see [`DEVELOPMENT.md`](./DEVELOPMENT.md).

---

## Editing pages (`.astro`)

A page is plain HTML inside the shared layout. The bit between `---` fences is JavaScript
(imports, data); everything below is the markup:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="My Page" description="…">
  <h1>My Page</h1>
  <p>Just write HTML here. <em>Italic</em>, <strong>bold</strong>, <a href="/ot/">links</a>.</p>
</Base>
```

> ⚠️ In `.astro` files, `{ }` means JavaScript. So the Markdown-only `{{ ref }}` scripture
> convention **does not work here** — use the `<Scripture>` / `<Ref>` components below instead.

### Quote a passage — `<Scripture>`

Pulls the actual verses from our text and renders a styled scripture blockquote with a
linked citation (verse numbers shown for multi-verse):

```astro
---
import Scripture from '../components/Scripture.astro';
---
<Scripture ref="JHN 5:39-40" />
```

### Link a reference inline — `<Ref>`

An inline citation link; the label is generated from the canon:

```astro
---
import Ref from '../components/Ref.astro';
---
<p>…the Apostle's phrase (<Ref ref="2CO 3:13-18" />).</p>   <!-- → 2 Corinthians 3:13–18 -->
<p>See <Ref ref="1KI 18:21" />.</p>                          <!-- → 3 Kingdoms (1 Kings) 18:21 -->
```

Override the link text with children: `<Ref ref="JHN 5:46">that verse</Ref>`.

### Footnotes — `<Fn>` + `<FnList>`

Numbered footnotes (numbers are for *your* notes; letters are reserved for the NT textual
apparatus). Create a collector in the frontmatter, mark inline, list once at the bottom:

```astro
---
import Fn from '../components/Fn.astro';
import FnList from '../components/FnList.astro';
import { footnotes } from '../lib/footnotes';
const fn = footnotes();
---
<Base title="…">
  <p>
    …as Behr argues.<Fn fn={fn} note="Fr. John Behr, <em>The Mystery of Christ</em>, 49–50." />
    And again here.<Fn fn={fn} note="St. Irenaeus, <em>Against the Heresies</em> 4.26.1." />
  </p>

  <FnList fn={fn} />      <!-- renders the numbered "Notes" list; place it last -->
</Base>
```

- `note` accepts HTML (`<em>…</em>`, `<a href>`, etc.).
- Numbering is automatic, in document order; each collector is scoped to its own page.
- Markers get a hover tooltip + click-to-jump for free.

### Collapsible FAQ items — `<Faq>`

A question with a click-to-expand answer (native `<details>`, no JS):

```astro
---
import Faq from '../components/Faq.astro';
---
<Faq q="Which Bible translation is this?">
  <p>The answer, in HTML.</p>
</Faq>
```

Add `open` to start expanded: `<Faq q="…" open>`. (See `src/pages/about/faqs.astro`.)

### Adding a brand-new page

Drop a file in `src/pages/` — its path becomes the URL (`src/pages/foo.astro` → `/foo`).
To list it in the **About** menu, add it to `ABOUT_PAGES` in `src/lib/nav.ts` and create
`src/pages/about/<slug>.astro`.

---

## Editing commentary (`.md`)

Commentary notes are Markdown files with a frontmatter **anchor** saying which passage they're
about. Full guide: [`ADDING-COMMENTARY.md`](./ADDING-COMMENTARY.md). In short:

```markdown
---
anchor: GEN 1:1
title: In the beginning
tags: cosmology
---

Your note in **Markdown**. Lists, tables, > blockquotes all work.

To quote scripture, put a reference in double braces on its own line:

{{ JHN 1:1 }}
```

- The note appears on every chapter page its anchor touches.
- `{{ JHN 1:1 }}` → the same styled scripture blockquote as `<Scripture>` (this is the
  Markdown equivalent; it only works in commentary `.md`, not in `.astro`).
- Source-citation footnotes are Phase 2; for now keep notes self-contained.

---

## Cheat sheet

| I want to… | In a page (`.astro`) | In commentary (`.md`) |
|---|---|---|
| Quote a passage | `<Scripture ref="JHN 1:1" />` | `{{ JHN 1:1 }}` |
| Link a reference | `<Ref ref="JHN 1:1" />` | *(Phase 2)* |
| Footnote | `<Fn fn={fn} note="…" />` + `<FnList fn={fn} />` | *(Phase 2)* |
| Bold / italic / link | `<strong> <em> <a>` | `**bold** *italic* [text](url)` |
