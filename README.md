# Byzantique

Dan's **commentary / notes** on the biblical text. A static site (Astro) over the Septuagint (Brenton's LXX for Old Testament) and the Text-Critical English New Testament (TCENT / BTV), with Orthodox lectionary awareness and client-side search.

> ### 🚧 Under active development — not ready yet
> This is an early work in progress. The whole Bible is browsable, but **most books
> have no commentary yet**, and **the lectionary is not built**. Expect
> rough edges, gaps, and breaking changes. Nothing here is final.
>
> **Live preview:** <https://byzantique.pages.dev> (will soon live at [byzantique.com](https://byzantique.com) once existing notes are migrated)

**Current status:** the whole Bible is browsable as static pages (Phase 1); commentary and
lectionary are in progress.

**Docs** (in [`docs/`](./docs)): [`EDITING-CONTENT.md`](./docs/EDITING-CONTENT.md)
(edit pages & commentary) · [`DEVELOPMENT.md`](./docs/DEVELOPMENT.md) (build & preview
locally) · [`ADDING-COMMENTARY.md`](./docs/ADDING-COMMENTARY.md) (write notes) ·
[`USFM-BOOK-NAMES.md`](./docs/USFM-BOOK-NAMES.md) (book codes ↔ source files).

## Quick start

```bash
npm install
npm run dev        # runs the data build, then the Astro dev server
# open http://localhost:4321/
```

Other scripts:

```bash
npm run data       # texts + commentary + intro builds → public/data/
npm run build      # data build + static site → dist/
npm run preview    # serve the built dist/ locally
```

## How it works

```
data/texts/{englxxup,engtcent}/*.usfm   vendored USFM — the whole canon (source of truth)
data/commentary/**/*.md                 author notes (Markdown + frontmatter anchors)
data/intro/engtcent.usfm                the TCENT translator's introduction
        │
        │   npm run data  →  scripts/build-{texts,commentary,intro}.mjs
        ▼
public/data/**                          generated JSON (gitignored)
src/lib/canon.ts                        canon registry (names, order, slugs, USFM codes)
src/pages/[testament]/[book]/[chapter].astro   static pages read the JSON at build time
```

- **Static-first (Option C hybrid):** every book and chapter is pre-rendered to HTML
  (~1,450 routes; full build ≈ 5s), so the entire Bible reads with no JavaScript. The
  per-chapter JSON is also served for client-side features (search, cross-ref previews).
- **Texts:** Updated Brenton Septuagint (`englxxup`, CC0 — LXX versification, incl. the
  Anagignoskomena) and the Text-Critical English NT / Byzantine Text Version (`engtcent`,
  CC BY 4.0). All 79 books are vendored as USFM under `data/texts/`.
- **Custom USFM parser:** `build-texts.mjs` parses USFM into a block model — paragraphs,
  poetry lines with indent levels, stanza breaks, Psalm titles — so scripture renders
  faithfully (no `usfm-grammar` dependency). It also extracts the TCENT textual apparatus
  (`\f…\f*`) into a separate **lettered** footnote stream shown beneath the text.
- **Commentary:** Markdown notes anchored to a reference (`GEN 1:1`, ranges, cross-chapter)
  via frontmatter, compiled by `build-commentary.mjs`; a `{{ REF }}` convention pulls live
  scripture into a note. See [`docs/ADDING-COMMENTARY.md`](./docs/ADDING-COMMENTARY.md).

## Deployment (Cloudflare Pages)

The site is a static Astro build (`dist/`). To deploy:

1. **GitHub** — the repo lives at [`biblenerd/byzantique`](https://github.com/biblenerd/byzantique).
2. **Cloudflare Pages** — dashboard → *Workers & Pages* → *Create* → *Pages* →
   *Connect to Git* → select the repo. Build settings:
   - Framework preset: **Astro**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
   - Environment variable: **`NODE_VERSION = 22`**
3. **Custom domain** — Pages project → *Custom domains* → add **`byzantique.com`**
   (and `www`). If the domain's DNS is on Cloudflare, records are added automatically.

## License

This repo mixes three licenses — see [`LICENSING.md`](./LICENSING.md) for details.

- **Code** (Astro, build scripts, styles) — **MIT** (see [`LICENSE`](./LICENSE)).
- **Commentary & notes** — © Byzantique, **CC BY-SA 4.0**.
- **Bundled texts** — their own licenses: Updated Brenton LXX (OT) — CC0;
  TCENT / Byzantine Text Version (NT) — CC BY 4.0, © Robert Adam Boyd.

## Colophon

Byzantique is built with [Astro](https://astro.build). Much of the engineering —
the build pipeline, components, and styling — was done in collaboration with
[Claude Code](https://claude.com/claude-code), Anthropic's agentic coding tool.
The biblical scholarship, commentary, notes, and editorial judgments are the author's own.

This project:
- began as a [GitHub Pages site](https://github.com/biblenerd/biblenerd.github.io) (deprecated in 2024), 
- evolved into a [Hugo static site hosted via Netlify](https://github.com/biblenerd/byzantique-hugo-site-files) (deprecated in 2026), and 
- is now an [Astro static site hosted via Cloudflare Pages](https://github.com/biblenerd/byzantique).
