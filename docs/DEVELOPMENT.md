# Local development & "compiling"

How to build and preview the site on your machine. (Deploying to Cloudflare Pages is in
[`README.md`](./README.md).)

## Prerequisites

- **Node.js ≥ 20** (developed on Node 24) and **npm**.
- `python3` is only needed if you want to serve the `prototypes/` mockups.

## One-time setup

```bash
npm install
```

> **Why `usfm-grammar` is pinned to v2:** v3 pulls in a native `tree-sitter` dependency that
> does not compile on current Node. v2 is pure JS. Its `npm audit` warnings are build-time
> only and never ship to the static site.

## Everyday commands

```bash
npm run dev        # regenerate data, then serve at http://localhost:4321 (hot reload)
npm run build      # regenerate data, then build the static site into dist/
npm run preview    # serve the built dist/ locally
npm run data       # ONLY regenerate the JSON data (no server/build)
```

`dev` and `build` run `npm run data` first, so you normally don't call `data` directly —
do it when you've edited source texts or commentary and just want to refresh the JSON.

## What "compiling" actually does

There are two stages: a **data build** (our scripts) and the **site build** (Astro).

### Stage 1 — data build (`npm run data`)

```
data/texts/englxxup/*.usfm  ─┐
data/texts/engtcent/*.usfm  ─┤  scripts/build-texts.mjs       → public/data/texts/<CODE>.json  + manifest.json
                             │  (usfm-grammar v2 + a raw-USFM paragraph/poetry scan)
data/commentary/**/*.md     ─┘  scripts/build-commentary.mjs  → public/data/commentary/<CODE>.json + manifest.json
                                (frontmatter + marked → anchored notes)
```

- **`public/data/` is generated and git-ignored.** Never edit it by hand; re-run `npm run data`.
- Source of truth: the vendored USFM in `data/texts/`, and your Markdown in `data/commentary/`.

### Stage 2 — site build (`astro build`)

Astro reads the generated JSON (via `src/lib/texts.ts`, `src/lib/commentary.ts`) and
**pre-renders every book/chapter page to static HTML** in `dist/`. That `dist/` folder is the
deployable site. (REQUIREMENTS.md §9 — static-first.)

## Adding a book's text

1. Drop the source USFM file into `data/texts/englxxup/` (OT) or `data/texts/engtcent/` (NT).
   Get it from the ebible.org ZIPs (`englxxup_usfm.zip`, `engtcent_usfm.zip`).
2. In `src/lib/canon.ts`, find the book and set `built: true` (and reconcile its `code` with
   the source `\id` — see [`USFM-BOOK-NAMES.md`](./USFM-BOOK-NAMES.md), e.g. Esther `ESG`,
   Daniel `DAG`).
3. `npm run dev` and open `/ot/<slug>/1`.

(Full-canon vendoring is Phase 1.)

## Adding commentary

See [`ADDING-COMMENTARY.md`](./ADDING-COMMENTARY.md). In short: add a Markdown file under
`data/commentary/` with an `anchor:` in its frontmatter, then `npm run dev`.

## Project layout

```
data/            source content (vendored USFM, your commentary, chip definitions)
scripts/         build-texts.mjs, build-commentary.mjs  (the data build)
src/lib/         canon registry + data loaders (texts, commentary, chips, nav)
src/pages/       Astro routes (home, [testament]/[book]/[chapter], about/, license, privacy)
src/layouts/ , src/components/ , src/styles/
public/          static assets (favicon, fonts) + generated public/data/ (git-ignored)
prototypes/      standalone HTML mockups (not part of the site)
```
