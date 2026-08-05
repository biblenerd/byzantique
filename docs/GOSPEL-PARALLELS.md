# Gospel parallels (synopsis)

A **harmony of the four Gospels** — a dataset that groups the parallel passages of Matthew,
Mark, Luke, and John into sections (pericopes), so the same event or teaching can be found
across the Gospels. It is data only: **not yet surfaced in the UI** (how it will be used is
a separate design step).

## Where it lives

```
data/parallels/synopsis.json        the source dataset (pericopes with per-Gospel refs)
scripts/build-parallels.mjs         the build: validates every ref, inverts into an index
public/data/parallels/<CODE>.json   generated verse→parallels index, per Gospel (git-ignored)
```

Run it: `node scripts/build-parallels.mjs`. (Not yet wired into `npm run data` — it will be
when the feature is used.)

## Schema

`synopsis.json` is `{ note, pericopes: [...] }`. Each pericope:

```json
{ "id": 13, "title": "The Ministry of John the Baptist",
  "refs": { "MAT": "3:1-6", "MRK": "1:2-6", "LUK": "3:1-6", "JHN": "1:19-23" } }
```

- **`id`** — the section number (1–213), in harmonized narrative order.
- **`title`** — a generic descriptive event label.
- **`refs`** — only the Gospels that contain the passage. The value is `chapter:verse` within
  that Gospel; ranges (`3:1-6`), cross-chapter ranges (`8:31-9:1`), and a trailing half-verse
  (`1:14a`) are allowed. Book codes are USFM (`MAT`/`MRK`/`LUK`/`JHN`).

The build inverts these into `public/data/parallels/<CODE>.json`, keyed by chapter, where each
entry carries its own verse span plus the parallel passages (label + href) in the other Gospels
— ready for a chapter page to show a "Synoptic parallels" affordance later.

## Provenance and licensing

The section order and titles follow the **public-domain** harmonies of **A. T. Robertson**,
*A Harmony of the Gospels* (1922), and **J. A. Broadus**, *A Harmony of the Gospels* (1893).
The parallels themselves are **textual facts**, and the titles are generic event labels. This
dataset is Byzantique's own compilation and is **not derived from Kurt Aland's copyrighted
*Synopsis Quattuor Evangeliorum*** (© Deutsche Bibelgesellschaft) — deliberately, to keep the
data freely reusable. It is licensed **CC BY-SA 4.0** like the commentary (see
[`LICENSING.md`](../LICENSING.md)).

## Quality control

`build-parallels.mjs` validates every reference against the vendored text (ENGLXXUP/ENGTCENT)
via the same `refLink` resolver the commentary build uses — a verse that does not exist fails
the build. It also reports **per-Gospel chapter coverage**. Current state:

- **213 pericopes, 405 references — all validated.**
- **Full chapter coverage:** Matthew 28/28, Mark 16/16, Luke 24/24, John 21/21.

Reference *boundaries* are machine-checked; the *mappings* (which passages are parallel)
follow standard harmony scholarship but warrant a final human review.

## Known limitations (future work)

- **Secondary / doublet parallels are not yet linked.** Where the same saying appears in two
  places (e.g. Sermon on the Mount material and its Lukan doublets in the travel narrative),
  each occurrence sits in its own pericope; they are not yet cross-linked. Aland grades these
  as "secondary" parallels — a later enhancement here.
- **Half-verses** (`1:14a`) are kept verbatim in the data but rounded to the whole verse for
  validation and indexing.
- The dataset is a **first complete pass**; pericope boundaries and titles may be refined.
