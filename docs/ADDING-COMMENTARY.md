# Adding commentary

Commentary notes are plain Markdown files with a small frontmatter header that says
**which passage the note is about**. The build turns them into JSON that the chapter pages
render. You never touch code to add a note.

> See also: [`DEVELOPMENT.md`](./DEVELOPMENT.md) (how to build/preview) and
> [`USFM-BOOK-NAMES.md`](./USFM-BOOK-NAMES.md) (the book codes to use in anchors).

## 1. Where notes live

```
data/commentary/<anything>/<your-note>.md
```

The folders under `data/commentary/` are **just for your own organization** (e.g.
`ot/genesis/`). The build scans the whole tree recursively. **The book a note belongs to is
taken from its anchor, not its folder** — so a note about Genesis must have a `GEN` anchor,
wherever the file sits.

## 2. File format

```markdown
---
anchor: GEN 1:1
title: In the beginning
tags: cosmology, christology
---

Your commentary, in Markdown. **Bold**, *italic*, lists, tables, and
> block quotes all work.
```

Frontmatter fields:

| Field | Required | Notes |
|---|---|---|
| `anchor` | **yes** | The passage this note is about (see §3). |
| `title` | no | Shown as the note heading. |
| `tags` | no | Comma-separated; not yet surfaced in the UI (reserved for "see also"). |

The body is **GitHub-Flavored Markdown** (rendered with `marked`): headings, **bold**,
*italic*, bullet/numbered lists, tables, and `>` block quotes. Greek and Hebrew render fine
inline.

## 3. The `anchor` — pointing at a passage

The anchor is `BOOK CHAPTER:VERSE`, using the **USFM book code** (see
[`USFM-BOOK-NAMES.md`](./USFM-BOOK-NAMES.md)). Supported forms:

| Anchor | Means |
|---|---|
| `GEN 1:1` | a single verse |
| `GEN 1:14-19` | a verse range within one chapter |
| `GEN 1:1-2:3` | a range spanning chapters |
| `GEN 3` | a whole chapter |
| `GEN` | the **whole book** → shows on the book landing page (see below) |

A note appears on **every chapter page its anchor touches**. When several notes apply to the
same passage they are ordered **broad → narrow** (section essays first, then ranges, then
single verses). The one exception is a **whole-book** note (`anchor: GEN`): it renders on the
book landing page only, not on every chapter.

## Quoting scripture — `{{ … }}`

To drop a block quote of actual scripture into a note, put a reference in **double braces**
on its own line:

```markdown
… as John says:

{{ JHN 1:1 }}

… and so the Word is eternal.
```

The build pulls the verse text and renders a styled scripture blockquote with a linked
citation — you never copy/paste the text. The reference uses the same grammar as anchors
(USFM book code + chapter:verse), so ranges work too:

| Include | Result |
|---|---|
| `{{ JHN 1:1 }}` | John 1:1 |
| `{{ GEN 1:1-3 }}` | Genesis 1:1–3 (verse numbers shown for multi-verse) |
| `{{ GEN 1:1-2:3 }}` | spans chapters |

If a reference doesn't resolve, the build warns and leaves the `{{ … }}` text in place so
you notice.

> **In `.astro` pages** (e.g. the About pages), `{{ … }}` won't work — Astro reads `{ }` as
> JavaScript. Use the component instead: `import Scripture from '…/components/Scripture.astro'`
> then `<Scripture ref="JHN 5:39-40" />`. Same result, same reference grammar.

## Cross-references — `[text](ref:…)`

To link inline to another passage, use a normal Markdown link with a `ref:` target:

```markdown
… the seventh-day rest of [Genesis 2:1–3](ref:GEN 2:1-3).
```

The reference grammar is the same as anchors (`ref:JHN 1:1`, `ref:GEN 1:1-2:3`, `ref:GEN 3`,
or a bare `ref:GEN` for the book page). The link resolves to the right page, and hovering it
shows a preview of the first verse. **A bad reference fails the build** — so typos are caught
at `npm run data`/`build` rather than shipping a dead link. (In `.astro` pages use
`<Ref ref="GEN 2:1-3" />` instead.)

## Footnotes — `[^id]`

For source citations, use Markdown-style footnotes: a caller `[^id]` in the text and a
definition `[^id]: …` anywhere in the note. The `id` is just a label (`1`, `behr`, …); notes
are **numbered** in order of first use.

```markdown
…not two items in a list but a totality.[^merism]

[^merism]: On "heaven and earth" as a *merism* for the whole created order, see the
    standard Genesis commentaries.
```

Footnote definitions accept inline Markdown (and `ref:` links). They render as a numbered
list at the bottom of the note, with a hover preview and click-to-jump — the **numbers** are
your citations; **letters** stay reserved for the NT textual apparatus. (In `.astro` pages use
the `<Fn>` / `<FnList>` components instead.)

## 4. See it

```bash
npm run dev          # builds the data, then serves http://localhost:4321
```

Open the chapter you anchored to (e.g. `/ot/genesis/1`). The note shows under **Commentary**.
Re-running picks up new/edited files. (`npm run data` alone just regenerates the JSON.)

## 5. Example

`data/commentary/ot/genesis/01-in-the-beginning.md`:

```markdown
---
anchor: GEN 1:1
title: In the beginning
tags: cosmology, christology
---

The Septuagint opens with **ἐν ἀρχῇ** (*en archē*), "in the beginning." …

> The Fathers do not read "beginning" as a bare point in time, but as the
> source and rationale of created things.
```

## Section / pericope titles

Section headings above the text come from two places (REQUIREMENTS §5.3):

1. **USFM `\s` headings** — already in the source text (the NT/TCENT has these,
   e.g. "The Birth of Jesus"). They render automatically; nothing to do.
2. **Author pericope titles** — your own headings, defined per book in
   `data/pericopes/<CODE>.json`. Useful for the OT (ENGLXXUP has no `\s`):

   ```json
   [
     { "start": "1:1", "title": "The Creation" },
     { "start": "2:4", "title": "Adam and Eve in the Garden" },
     { "start": "3:1", "title": "The Fall" }
   ]
   ```

   `start` is the book-relative `chapter:verse` where the section begins; the title
   renders as a heading just before that verse. An author title **takes precedence**
   over a USFM `\s` heading at the same spot. `<CODE>` is the USFM book code
   (see [USFM-BOOK-NAMES.md](./USFM-BOOK-NAMES.md)). Re-run `npm run dev`/`build` to see changes.

## Book introductions & book-level commentary

The **book landing page** (`/{testament}/{book}/`) shows two optional things above
the chapter grid:

- **Introduction** — `data/book-intros/<CODE>.md`. Plain Markdown (supports the
  `{{ ref }}` scripture-quote convention). Renders at the top of the book page.
- **Book-level commentary** — a normal note whose `anchor` is a **bare book code**
  (e.g. `anchor: GEN`). It appears under "Book commentary" on the book page and is
  **not** repeated on every chapter page (nor counted in the coverage bar).

```markdown
---
anchor: GEN
title: Reading Genesis as a whole
---
Genesis is structured around a series of *toledot* formulas …
```
