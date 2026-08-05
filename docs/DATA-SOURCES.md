# Data sources

Where every dataset the site is built from comes from, in what format, and how to refresh it or
recreate it from scratch. Companion to [DEVELOPMENT.md](./DEVELOPMENT.md) (setup and the build
pipeline) and the source-specific docs linked below.

## What's committed, what's generated

Two kinds of data live in this repo:

| | Path | In git? | What it is |
|---|---|---|---|
| **Source** | `data/**` | ✅ committed | Inputs the build reads: vendored scripture (USFM), lectionary data, the parallels dataset, and Byzantique's own authored content. |
| **Generated** | `public/data/**` | ❌ git-ignored | JSON the `npm run data` scripts produce from `data/`. Rebuilt on every `npm run dev` / `npm run build`. |

A fresh clone already has everything it needs: install, run the data build, and `public/data/`
regenerates. Nothing external is required to run the site. This doc exists so that the vendored
inputs can be **refreshed from upstream** or **rebuilt from scratch** if you ever want to, and so
the provenance, format, and license of each is written down in one place.

## Recreate the running data from a clone

```bash
nvm use              # Node 24 (see .nvmrc)
npm install
npm run data         # regenerates public/data/** from data/**
```

Everything below is only needed to **re-vendor** the upstream inputs under `data/` (updating or
rebuilding them), not for a normal checkout.

---

## 1. Scripture texts · `data/texts/`

The whole biblical text, vendored as **USFM**, one file per book. Two translations are actually
vendored and read by the build:

| Folder | Translation | ebible.org id | License |
|---|---|---|---|
| `data/texts/englxxup/` | Updated Brenton English Septuagint (Old Testament) | [`englxxup`](https://ebible.org/find/details.php?id=englxxup) | Public domain (CC0) |
| `data/texts/engtcent/` | Text-Critical English NT / Byzantine Text Version (New Testament) | [`engtcent`](https://ebible.org/find/details.php?id=engtcent) | CC BY 4.0, © Robert Adam Boyd |

> The other translations listed on the site's [Texts and Translations](../src/pages/about/texts-and-translations.astro)
> page (WEB, and the Greek and Hebrew source texts) are documented comparanda only. They are
> **not** vendored and the build does not read them.

**Get it** — download the USFM ZIP from ebible.org and extract the per-book files into the
matching folder:

```bash
# Old Testament (Septuagint)
curl -O https://ebible.org/Scriptures/englxxup_usfm.zip
unzip englxxup_usfm.zip -d data/texts/englxxup/

# New Testament (TCENT / BTV)
curl -O https://ebible.org/Scriptures/engtcent_usfm.zip
unzip engtcent_usfm.zip -d data/texts/engtcent/
```

**Format** — USFM, files named `NN-CODEsuffix.usfm` (e.g. `02-GENenglxxup.usfm`,
`46-MATengtcent.usfm`). The numeric prefix is the standard USFM/Paratext order, **not** this
site's canon order. A custom line-oriented parser (`scripts/build-texts.mjs`, no `usfm-grammar`
dependency) reads them. For how each source `\id` maps to our USFM codes, and the decided
Esdras / Esther / Daniel mappings, see [USFM-BOOK-NAMES.md](./USFM-BOOK-NAMES.md).

### Translator's introduction · `data/intro/engtcent.usfm`

The TCENT front matter (the translator's Introduction to the New Testament), a peripheral USFM
file that ships in the same `engtcent` ebible package. Built by `scripts/build-intro.mjs`,
rendered at `/nt/introduction/`.

---

## 2. Lectionary · `data/lectionary/`

Orthodox calendar and daily readings, derived from
**[orthocal-python](https://github.com/brianglass/orthocal-python)** by Brian Glass (**MIT**; the
license is vendored at `data/lectionary/ORTHOCAL-LICENSE.txt`). Byzantique precomputes everything
locally, so the site makes no runtime calls to any service.

Two inputs:

| Path | What it is | How it was produced |
|---|---|---|
| `data/lectionary/calendarium.json` | The movable-calendar day table (feasts, fasts, service notes keyed by paschal distance). A Django `calendarium` fixture. | Taken directly from orthocal-python's `calendarium` fixture (the data behind its `./manage.py loaddata calendarium`). |
| `data/lectionary/dates/<year>.json` | Per-year `MM-DD → { titles, feast_level, readings[] }` maps, one file per year 1950–2100. | Computed by running orthocal-python's calendar/lectionary engine for each year and serializing the day → readings map. |

**Format** (`dates/<year>.json`):

```json
{ "01-01": { "titles": ["Thursday of the 30th week after Pentecost"], "feast_level": 6,
    "readings": [ { "source": "Gospel", "ref": "Luke 2.20-21", "desc": "" }, … ] }, … }
```

`scripts/build-lectionary.mjs` turns these into the chapter-page reading chips
(a `passage → occasions` index) and the date lookup that powers the `/lectionary/` page.

---

## 3. Gospel parallels · `data/parallels/synopsis.json`

A harmony of the four Gospels: **Byzantique's own compilation**, arranged after the public-domain
harmonies of A. T. Robertson (1922) and J. A. Broadus (1893). Not derived from Aland's copyrighted
synopsis. Licensed **CC BY-SA 4.0** (same as the commentary).

**Format** — `{ note, pericopes: [ { id, title, refs: { MAT, MRK, LUK, JHN } } ] }`, each `ref` a
`chapter:verse` range. Full schema, provenance, QC, and how it drives the Synoptic parallels panel
and the comparison modal: [GOSPEL-PARALLELS.md](./GOSPEL-PARALLELS.md).

---

## 4. Authored content (no upstream) · `data/commentary/`, `data/book-intros/`, `data/pericopes/`, `data/chip-definitions.json`

Byzantique's own writing and editorial data. There is no external source to pull; these are the
hand-authored inputs, all committed.

| Path | What it is | Author with |
|---|---|---|
| `data/commentary/**/*.md` | Commentary notes (Markdown + `anchor` frontmatter). | The [Studio](./STUDIO.md) editor (preferred), or [by hand](./ADDING-COMMENTARY.md). |
| `data/book-intros/<CODE>.md` | Per-book introductions (Markdown, supports `{{ ref }}`). | By hand. |
| `data/pericopes/<CODE>.json` | Author section/pericope titles: `[{ start, title }]`. | By hand. |
| `data/chip-definitions.json` | Hover tooltips for the book grouping/status chips. | By hand. |

---

## Generated output · `public/data/` (git-ignored)

`npm run data` writes, from the sources above:

```
public/data/texts/<CODE>.json + manifest.json          scripts/build-texts.mjs
public/data/commentary/<CODE>.json + backlinks.json    scripts/build-commentary.mjs
public/data/intro/engtcent.json                        scripts/build-intro.mjs
public/data/lectionary/{chips,year}/… + pascha.json    scripts/build-lectionary.mjs
public/data/parallels/<CODE>.json + manifest.json      scripts/build-parallels.mjs
```

Never edit anything under `public/data/` by hand; re-run `npm run data`. The other git-ignored
paths (`dist/`, `node_modules/`, `.astro/`) are build output and dependencies, not data. See
[`.gitignore`](../.gitignore) for the full list.
