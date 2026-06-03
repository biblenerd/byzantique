# Byzantique

A scholarly **commentary corpus** on the biblical text, from an Eastern Orthodox
perspective — a static site (Astro) over the Septuagint (OT) and the Text-Critical
English New Testament, with Orthodox lectionary awareness and client-side search.

Current status: the whole Bible is browsable as static pages (Phase 1); commentary,
lectionary, and client-side search are in progress.

**Docs** (in [`docs/`](./docs)): [`EDITING-CONTENT.md`](./docs/EDITING-CONTENT.md)
(edit pages & commentary) · [`DEVELOPMENT.md`](./docs/DEVELOPMENT.md) (build & preview
locally) · [`ADDING-COMMENTARY.md`](./docs/ADDING-COMMENTARY.md) (write notes) ·
[`USFM-BOOK-NAMES.md`](./docs/USFM-BOOK-NAMES.md) (book codes ↔ source files).

## Quick start

```bash
npm install
npm run dev        # runs the data build, then the Astro dev server
# open http://localhost:4321/ot/genesis/1
```

Other scripts:

```bash
npm run data       # build-texts: vendored USFM → public/data/texts/*.json
npm run build      # data build + static site → dist/
npm run preview    # serve the built dist/ locally
```

## How it works (Phase 0)

```
data/texts/englxxup/   vendored USFM (source of truth)  ──┐
                                                          │  scripts/build-texts.mjs
public/data/texts/*.json  generated, per-book  ◄──────────┘  (usfm-grammar + paragraph scan)
src/lib/canon.ts          canon registry (Appendix A: names, order, slugs, USFM codes)
src/pages/[testament]/[book]/[chapter].astro   static chapter pages (read the JSON at build)
```

- **Static-first** (REQUIREMENTS.md §9, Option C): every chapter is pre-rendered to HTML;
  the per-chapter JSON is also served for later client-side features.
- **Texts:** Updated Brenton Septuagint (`englxxup`, CC0) and TCENT (`engtcent`, CC BY 4.0).
  Genesis is vendored under `data/texts/englxxup/`; the rest of the canon follows in Phase 1.

> Note: `usfm-grammar` is pinned to **v2** (pure JS). v3 pulls in native `tree-sitter`,
> which does not compile on current Node. v2's npm-audit warnings are build-time only and
> never ship to the static site.

## Deployment (Cloudflare Pages)

The site is a static Astro build (`dist/`). To deploy:

1. **GitHub** — create a new empty repo and push:
   ```bash
   git remote add origin git@github.com:<you>/byzantique.git
   git push -u origin main
   ```
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
The biblical scholarship, commentary, and editorial judgments are the author's own.
