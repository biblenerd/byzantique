# The Studio — the preferred way to add commentary

The **Studio** is a small, local, form-driven editor for commentary notes at
**`/studio`**. It is the **recommended** way to create and edit notes: it writes the file to
the correct place, fills the frontmatter, previews the note exactly as it will look on the
site, and validates every reference as you type. You can still hand-write Markdown files if
you prefer (see [`ADDING-COMMENTARY.md`](./ADDING-COMMENTARY.md)) — the Studio just does the
same thing for you and keeps the filing tidy.

> **Dev-only.** The Studio exists only under `astro dev`; it is never part of the built
> production site (`astro build` skips it entirely), so it ships nothing and needs no auth.

## Open it

```bash
npm run dev
# then open http://localhost:4321/studio
```

Three panes: a **note browser** (left), the **editor** (center — book/reference, title,
tags, and the Markdown body), and **filename + Save + live preview** (right).

## What it does for you

- **Files to the right path automatically** from the reference (see [Conventions](#conventions-the-studio-locks-in) below). Book-level vs chapter-level is handled for you.
- **Live preview** rendered through the *real* build pipeline — footnotes, scripture quotes,
  cross-reference hover previews, all exactly as the site will show them.
- **Live validation** — unresolved `ref:` / `note:` references are underlined inline and
  listed, using the same checks that fail the build. You catch a bad reference before you save.
- **Editable filename** — defaults to a slug of the title, but you can override it (top-right,
  inline with the path). No more `untitled` when a note has no title.
- **Insert helpers** (toolbar):
  - **Cross-reference** — pick book → chapter:verse, validated live (shows the passage and
    its first verse), inserts `[label](ref:…)`.
  - **Link to a note** — searchable picker over all notes; inserts `[title](note:id)`,
    auto-qualifying `CODE/id` when an id is ambiguous.
  - **Quote passage** — inserts a `{{ REF }}` scripture block.
  - **Footnote** — drops `[^id]` at the cursor and its definition at the bottom of the note.
  - **YouTube** — inserts a `{{ youtube … }}` embed.
- **Tag autocomplete** — the Tags field is chips with suggestions drawn from tags already in
  the corpus (keeps the vocabulary consistent).
- **Unsaved-changes guard** — warns before switching notes or reloading would lose edits.
- **Path linter ("filing issues")** — flags notes whose filename drifts from the convention
  (wrong folder/padding, or an unclean slug). Click a flagged note to open it; **Save**
  relocates it to the correct path.
- **Rename with reference fixup** — if a save renames a note and orphans its old id, every
  `note:` link pointing at it is repointed automatically (and the count is reported).

## Conventions the Studio locks in

The build only cares about a note's **`anchor`** — the file could live anywhere. But the
Studio writes every note to a consistent path so the tree stays tidy. If you hand-author a
note, following these keeps the Studio's path linter quiet.

### Frontmatter

```markdown
---
anchor: ROM 5:12          # required — the passage the note is about
title: Because of which   # optional — the note heading
tags: translation         # optional — comma-separated
---
```

### Anchor forms

| Anchor | Means |
|---|---|
| `ROM 5:12` | a single verse |
| `GEN 1:14-19` | a range within a chapter |
| `GEN 1:1-2:3` | a range spanning chapters |
| `GEN 3` | a whole chapter |
| `GEN` | the whole book (renders on the book landing page) |

### Where the file goes

```
data/commentary/<testament>/<book>/<chapter>/<CODE_CH_VV-slug>.md
```

- **`<testament>`** — `ot` or `nt`.
- **`<book>`** — the canon slug with hyphens turned to underscores, i.e. the lowercase full
  book name (LXX/Orthodox name), underscores for spaces: `romans`, `micah`,
  **`song_of_songs`**, **`1_kingdoms`**, **`wisdom_of_solomon`**.
- **`<chapter>`** — the chapter number padded to the width of the book's largest chapter:
  two digits for every book, **three for Psalms** (`073`, `119`).
- **filename** — `CODE_chapter_verse-slug.md`, chapter and verse padded to **two digits
  minimum** (so `ROM_05_12-…`, and a natural three-digit chapter like Psalm 119 stays
  `PSA_119_…`). For ranges: `CODE_ch_startverse-endverse` within a chapter
  (`GEN_01_01-31-…`) or `CODE_sc_sv-ec_ev` across chapters (`GEN_01_01-02_03-…`). Filing a
  range by its **start verse only** (`GEN_01_26-…` for `GEN 1:26-27`) is also accepted.
- **book-level notes** (a bare book anchor) file in the book folder with no chapter folder:
  `data/commentary/ot/genesis/GEN_00-slug.md`.
- **slug** — a kebab-case of the title (lowercase letters, digits, hyphens), editable.

Examples:

| Anchor | Path |
|---|---|
| `ROM 5:12` | `data/commentary/nt/romans/05/ROM_05_12-eph-ho.md` |
| `GEN 1:1-2:3` | `data/commentary/ot/genesis/01/GEN_01_01-02_03-symmetry.md` |
| `PSA 73:13-14` | `data/commentary/ot/psalms/073/PSA_73_13-14-dragons.md` |
| `SNG 1:1` | `data/commentary/ot/song_of_songs/01/SNG_01_01-…md` |
| `GEN` (book) | `data/commentary/ot/genesis/GEN_00-toledot.md` |

### Body shortcodes

The same shorthands as hand-authored notes (full details in
[`ADDING-COMMENTARY.md`](./ADDING-COMMENTARY.md)): `[text](ref:JHN 1:1)` cross-references,
`[text](note:ID)` note links, `{{ REF }}` scripture quotes, `text[^id]` / `[^id]: …`
footnotes, and `{{ youtube … }}` embeds. Every `ref:` / `note:` reference is validated —
a bad one fails the build.

## Saving

Save writes the file (creating folders as needed) and, because the dev data-watcher is
running, the site rebuilds and reloads automatically. If you changed the anchor or filename
of an existing note, the file is **moved** to its new path (and any `note:` links to it are
repointed). Everything lands in `data/commentary/` as ordinary Markdown — nothing about a
note depends on the Studio, so it stays fully hand-editable.
