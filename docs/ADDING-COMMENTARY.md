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

A note appears on **every chapter page its anchor touches**. When several notes apply to the
same passage they are ordered **broad → narrow** (book/section essays first, then ranges,
then single verses).

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

> Coming later (Phase 2): named pericope titles, book-level intros, inline `ref:` scripture
> links, footnotes, and build-time validation that rejects a bad anchor. For now an anchor
> that doesn't parse is skipped with a warning during `npm run data`.

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
