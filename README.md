# Byzantique

Dan's **commentary / notes** on the biblical text. A static site (Astro) over the Septuagint (Brenton's LXX for Old Testament) and the Text-Critical English New Testament (TCENT / BTV), with Orthodox lectionary awareness and client-side search.

> ### 🚧 Under active development
> This is an early work in progress. The whole Bible is browsable, the reading experience
> (side-by-side text + commentary) is built, and the **Orthodox lectionary is wired up**
> (readings by date, 1950–2100). But **commentary is still sparse:** so far only Genesis
> is seeded. Expect rough edges, gaps, and breaking changes. Nothing here is final.
>
> **Visit the site** at [byzantique.com](https://byzantique.com)

**Current status:** the platform is largely built — whole-Bible browsing, the side-by-side
reader, cross-references, self-hosted Greek/Hebrew fonts, and the lectionary are all in
place. The remaining work is **writing the commentary**.

**Docs:** see [`docs/`](./docs/) — editing pages & commentary, local development, and
USFM book codes. (Start at the [docs index](./docs/README.md).)

## Quick start

```bash
npm install
npm run dev        # runs the data build, then the Astro dev server
# open http://localhost:4321/
```

Other scripts:

```bash
npm run data       # texts + commentary + intro + lectionary builds → public/data/
npm run build      # data build + static site → dist/
npm run preview    # serve the built dist/ locally
```

## How it works

```
data/texts/{englxxup,engtcent}/*.usfm   vendored USFM — the whole canon (source of truth)
data/intro/engtcent.usfm                the TCENT translator's introduction
data/commentary/**/*.md                 author notes (Markdown + frontmatter anchors)
data/book-intros/<CODE>.md              per-book introductions
data/pericopes/<CODE>.json              author section/pericope headings
data/lectionary/                        vendored orthocal data (fixtures + date dumps)
        │
        │   npm run data  →  scripts/build-{texts,commentary,intro,lectionary}.mjs
        ▼
public/data/**                          generated JSON (texts, commentary, lectionary; gitignored)
src/lib/canon.ts                        canon registry (names, order, slugs, USFM codes)
src/pages/**.astro                      static pages read the JSON at build time
```

- **Static-first:** every book and chapter is pre-rendered to HTML
  (~1,450 routes; full build ≈ 5s), so the entire Bible reads with no JavaScript. The
  per-chapter JSON is also served for client-side features (search, cross-ref previews,
  the lectionary date page).
- **Texts:** Updated Brenton Septuagint (`englxxup`, CC0 — LXX versification, incl. the
  Anagignoskomena) and the Text-Critical English NT / Byzantine Text Version (`engtcent`,
  CC BY 4.0). All 79 books are vendored as USFM under `data/texts/`.
- **Custom USFM parser:** `build-texts.mjs` parses USFM into a block model — paragraphs,
  poetry lines with indent levels, stanza breaks, Psalm titles, section headings — so
  scripture renders faithfully (no `usfm-grammar` dependency). It also extracts the TCENT
  textual apparatus (`\f…\f*`) into a separate **lettered** footnote stream below the text.
- **Reading experience:** chapters with commentary render a **side-by-side reader**
  (scripture left, notes right) with a stacked-layout toggle, a sticky text column, and
  hover linking between notes and the verses they cover. Books have landing pages with an
  introduction, a responsive chapter grid, and book-level commentary.
- **Commentary:** Markdown notes anchored to a reference (`GEN 1:1`, ranges, cross-chapter,
  or a bare book code) via frontmatter, compiled by `build-commentary.mjs`. Notes support
  a `{{ REF }}` scripture-inclusion convention, **cross-references** to passages
  (`[text](ref:JHN 1:1)`) and to other notes (`[text](note:ID)`), and numbered footnotes —
  all validated at build (a bad reference fails the build). See
  [`docs/ADDING-COMMENTARY.md`](./docs/ADDING-COMMENTARY.md).
- **Lectionary:** the Orthodox daily lectionary (New/Revised-Julian calendar, 1950–2100),
  precomputed from [`orthocal-python`](https://github.com/brianglass/orthocal-python)'s own
  engine — no runtime API dependency. `build-lectionary.mjs` produces a date→readings map
  (the `/lectionary/` date page + "Today's readings" on the home page) and a passage→occasions
  index (the reading chips shown on chapter pages, which link to the next date each is read).
- **Greek & Hebrew:** self-hosted OFL fonts — Noto Serif for polytonic Greek and Ezra SIL
  for pointed/cantillated Hebrew — applied automatically per script via CSS `unicode-range`,
  so they download only on pages that need them.

## Deployment (Cloudflare Pages)

The site is a static Astro build (`dist/`). To deploy:

1. **GitHub** — the repo lives at [`biblenerd/byzantique`](https://github.com/biblenerd/byzantique).
2. **Cloudflare Pages** — dashboard → *Workers & Pages* → *Create* → *Pages* →
   *Connect to Git* → select the repo. Build settings:
   - Framework preset: **Astro**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
   - Node version: pinned to **24** (LTS) via [`.nvmrc`](./.nvmrc), which Cloudflare Pages
     reads automatically. **A `NODE_VERSION` environment variable in the dashboard overrides
     `.nvmrc`** — so remove that variable (preferred) or set it to `24`. (Astro 6 needs Node ≥ 22.12.)
3. **Custom domain** — Pages project → *Custom domains* → add **`byzantique.com`**
   (and `www`). If the domain's DNS is on Cloudflare, records are added automatically.

## License

This repo mixes several licenses — see [`LICENSING.md`](./LICENSING.md) for details.

- **Code** (Astro, build scripts, styles) — **MIT** (see [`LICENSE`](./LICENSE)).
- **Commentary & notes** — © Byzantique, **CC BY-SA 4.0**.
- **Bundled texts** — their own licenses: Updated Brenton LXX (OT) — CC0;
  TCENT / Byzantine Text Version (NT) — CC BY 4.0, © Robert Adam Boyd.
- **Bundled fonts** — Noto Serif and Ezra SIL, both **SIL Open Font License 1.1**
  (see [`public/fonts/`](./public/fonts/)).
- **Lectionary data** — derived from [`orthocal-python`](https://github.com/brianglass/orthocal-python)
  (MIT); its license is vendored at `data/lectionary/ORTHOCAL-LICENSE.txt`.

## Colophon

Byzantique is built with [Astro](https://astro.build). Much of the engineering —
the build pipeline, components, and styling — was done in collaboration with
[Claude Code](https://claude.com/claude-code), Anthropic's agentic coding tool.
The biblical scholarship, commentary, notes, and editorial judgments represent Dan's research.

This project:
- began as a [GitHub Pages site](https://github.com/biblenerd/biblenerd.github.io) (deprecated in 2024), 
- evolved into a [Hugo static site hosted via Netlify](https://github.com/biblenerd/byzantique-hugo-site-files) (deprecated in 2026), and 
- is now an [Astro static site hosted via Cloudflare Pages](https://github.com/biblenerd/byzantique).
