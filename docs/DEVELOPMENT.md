# Local development & "compiling"

How to build and preview the site on your machine. (Deploying to Cloudflare Pages is in
[`README.md`](./README.md).)

## Prerequisites

- **Node.js ≥ 22.18** (Astro 7 needs ≥ 22.12; the data scripts import `.ts` directly, which
  needs ≥ 22.18 for native type-stripping). Pinned to **24 (LTS)** in [`.nvmrc`](../.nvmrc) —
  run `nvm use` first if you use nvm. And **npm ≥ 9.6.5** (any recent Node ships this).
- `python3` is only needed if you want to serve the `prototypes/` mockups.

> **Stack:** Astro **7** on Vite **8** (static output); a custom data build (our `.mjs`
> scripts) feeds it JSON. Pagefind for search. See the [tech-stack table](../README.md) in
> the top-level README.

> **⚠️ Don't run this project from inside a cloud-synced folder (Dropbox, iCloud, OneDrive).**
> Their virtual filesystems race with npm and Vite 8's dev-time file operations badly enough
> to **hang `astro dev`** and break `npm ci`. If the repo must live in one (this one is under
> Dropbox), exclude the generated/dependency dirs from sync — a committed
> [`.dropboxignore`](../.dropboxignore) covers `node_modules`, `dist`, `.astro`, and
> `public/data`, and they're additionally marked with the `com.dropbox.ignored` attribute.
> If `node_modules` is ever deleted and recreated, re-apply:
> `xattr -w com.dropbox.ignored 1 node_modules`.

## One-time setup

```bash
nvm use        # Node 24, from .nvmrc (optional but recommended)
npm install    # or `npm ci` to match the committed lockfile exactly
```

## Everyday commands

```bash
npm run dev        # regenerate data, then serve at http://localhost:4321 (hot reload)
npm run build      # regenerate data, then build the static site into dist/
npm run preview    # serve the built dist/ locally
npm run data       # ONLY regenerate the JSON data (no server/build)
```

`dev` and `build` run `npm run data` first, so you normally don't call `data` directly —
do it when you've edited source texts or commentary and just want to refresh the JSON.

## Updating dependencies (safely)

Day-to-day you're already covered: **`npm ci`** installs exactly what's pinned in
`package-lock.json` and fetches **no new versions**, so normal work never pulls anything new.
Supply-chain risk only appears when you *deliberately* fetch new versions.

- **Preferred: let Dependabot drive updates.** [`.github/dependabot.yml`](../.github/dependabot.yml)
  opens grouped PRs with a **7-day cooldown** (a freshly-published, possibly-compromised
  release isn't proposed until it's had a week to be caught/yanked). Merge the PR → `git pull`
  → `npm ci`. Security fixes (enable *Dependabot security updates* in repo Settings) bypass the
  cooldown. CI re-runs `npm ci && npm run build && npm audit` on every PR.
- **Manual add/update — apply the same cooldown with npm's `--before`:**
  ```bash
  npm install <pkg>@latest --before="$(date -v-7d +%F)"   # macOS: only versions ≥ 7 days old
  ```
  (`date -d '7 days ago' +%F` on Linux.) Then commit the updated `package.json` + lockfile.
- **Optional, stronger:** `npx socket npm install <pkg>` wraps the install with behavioral
  supply-chain checks (suspicious install scripts, new/ typosquatted packages) before anything
  lands on disk.

Avoid bare `npm install <pkg>@latest` (no `--before`) the day a release drops — that's the one
window the cooldown exists to skip.

## What "compiling" actually does

There are two stages: a **data build** (our scripts) and the **site build** (Astro).

### Stage 1 — data build (`npm run data`)

```
data/texts/englxxup/*.usfm  ─┐
data/texts/engtcent/*.usfm  ─┤  scripts/build-texts.mjs       → public/data/texts/<CODE>.json  + manifest.json
                             │  (a custom line-oriented USFM block parser — no dependency)
data/commentary/**/*.md     ─┘  scripts/build-commentary.mjs  → public/data/commentary/<CODE>.json + backlinks.json
                                (frontmatter + marked → anchored notes + cross-reference index)
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
2. Reconcile the book's `code` in `src/lib/canon.ts` with the source `\id` if they differ
   (see [`USFM-BOOK-NAMES.md`](./USFM-BOOK-NAMES.md), e.g. Esther `ESG`, Daniel `DAG`). Which
   books have text is derived from the generated text manifest at build time — there is no
   `built` flag to set.
3. `npm run dev` and open `/ot/<slug>/1`.

(Full-canon vendoring is Phase 1.)

## Adding commentary & structure

The **[Studio](./STUDIO.md)** (`npm run dev` → `/studio`) is the preferred way to write
notes — form-driven, with live preview and validation, and it files each note correctly.
For the hand-authored format see [`ADDING-COMMENTARY.md`](./ADDING-COMMENTARY.md). In short:

- **Notes** — a Markdown file under `data/commentary/` with an `anchor:` in its frontmatter.
- **Book introductions** — `data/book-intros/<CODE>.md` (renders atop the book page).
- **Book-level commentary** — a note whose `anchor` is a bare book code (e.g. `GEN`).
- **Section / pericope titles** — `data/pericopes/<CODE>.json` (`[{ start, title }]`); USFM
  `\s` headings in the source text (NT) are also picked up automatically.

After any edit, run `npm run dev` (or `npm run build`) to regenerate.

## Project layout

```
data/texts/{englxxup,engtcent}/   vendored USFM (source of truth)
data/commentary/                  your notes (Markdown + anchor frontmatter)
data/book-intros/<CODE>.md        per-book introductions
data/pericopes/<CODE>.json        author section/pericope titles
data/intro/engtcent.usfm          the TCENT translator's introduction
scripts/         build-{texts,commentary,intro,lectionary,parallels}.mjs  (the data build) + validate-commentary.mjs
studio/          dev-only notes editor (Astro integration + API + /studio page) — never built for production
src/lib/         canon registry + loaders (texts, commentary, pericopes, bookintro, chips, nav) + notes/shortcodes
src/pages/       Astro routes (home, [testament]/[book]/[chapter], about/, search, license, privacy)
src/layouts/ , src/components/ , src/styles/
public/          static assets (favicon, fonts) + generated public/data/ (git-ignored)
```
