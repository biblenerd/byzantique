# USFM book names & source mapping

How our **display names / USFM codes** (defined in `src/lib/canon.ts`, mirroring
REQUIREMENTS.md Appendix A) line up with the **source USFM files** we vendor:

- **Old Testament** → `englxxup` (Updated Brenton Septuagint), vendored under
  `data/texts/englxxup/`. Files named like `02-GENenglxxup.usfm`.
- **New Testament** → `engtcent` (Text-Critical English NT), under `data/texts/engtcent/`.
  Files named like `46-MATengtcent.usfm`.

The **USFM code** (the `\id` at the top of each file, also in the filename) is our stable
internal key. The build (`scripts/build-texts.mjs`) keys output JSON by that code; anchors in
commentary use it; `src/lib/canon.ts` maps it to a display name.

> ⚠️ **Source numbering ≠ our order.** The numeric file prefixes follow standard USFM/Paratext
> ordering (and the minor-prophet files even use Masoretic order); we re-order to the
> Septuagint/Orthodox sequence in `canon.ts`. Match books by **code**, not file number.

## Decided source mappings

**Esdras (decided):**

- **Esdras A** = ENGLXXUP **"Esdras I"** (source `\id` `1ES`, 9 ch). Code already matches ours.
- **Esdras B** = ENGLXXUP **"Ezra and Nehemiah"** (source `\id` `EZR`, 23 ch — already a single
  combined book; there is **no separate Nehemiah** file, and no combine step is needed). Code
  already matches ours.

**Code remaps still needed when vendoring the full OT (Phase 1)** — these are the *only* two
ENGLXXUP files whose code differs from our canon:

| Our canon | Our code | ENGLXXUP file / `\id` | Action |
|---|---|---|---|
| Esther | `EST` | **`ESG`** — "Esther (Greek)", 10 ch | LXX Esther with the Greek additions. Map `ESG → EST` at build (or adopt `ESG`). |
| Daniel | `DAN` | **`DAG`** — "Daniel (Greek)", 12 ch | LXX Daniel with additions. Map `DAG → DAN`. **Also** Susanna (`SUS`) and Bel (`BEL`) ship as *separate* files — check whether `DAG` already embeds them to avoid duplication. |

There is **no separate "Song of the Three / Prayer of Azariah"** file in ENGLXXUP (if present,
it is inside `DAG`).

## Old Testament — `englxxup`

In our (Appendix A) order. ✓ = source code matches our code.

| # | Display name | Our code | ENGLXXUP file |
|---|---|---|---|
| 1 | Genesis | `GEN` | `02-GENenglxxup.usfm` ✓ |
| 2 | Exodus | `EXO` | `03-EXOenglxxup.usfm` ✓ |
| 3 | Leviticus | `LEV` | `04-LEVenglxxup.usfm` ✓ |
| 4 | Numbers | `NUM` | `05-NUMenglxxup.usfm` ✓ |
| 5 | Deuteronomy | `DEU` | `06-DEUenglxxup.usfm` ✓ |
| 6 | Joshua | `JOS` | `07-JOSenglxxup.usfm` ✓ |
| 7 | Judges | `JDG` | `08-JDGenglxxup.usfm` ✓ |
| 8 | Ruth | `RUT` | `09-RUTenglxxup.usfm` ✓ |
| 9 | 1 Kingdoms (1 Samuel) | `1SA` | `10-1SAenglxxup.usfm` ✓ |
| 10 | 2 Kingdoms (2 Samuel) | `2SA` | `11-2SAenglxxup.usfm` ✓ |
| 11 | 3 Kingdoms (1 Kings) | `1KI` | `12-1KIenglxxup.usfm` ✓ |
| 12 | 4 Kingdoms (2 Kings) | `2KI` | `13-2KIenglxxup.usfm` ✓ |
| 13 | 1 Supplements (Chronicles) | `1CH` | `14-1CHenglxxup.usfm` ✓ |
| 14 | 2 Supplements (Chronicles) | `2CH` | `15-2CHenglxxup.usfm` ✓ |
| 15 | Esdras A | `1ES` | `54-1ESenglxxup.usfm` — "Esdras I" (9 ch) ✓ |
| 16 | Esdras B | `EZR` | `16-EZRenglxxup.usfm` — "Ezra and Nehemiah" (23 ch) ✓ |
| 17 | Psalms | `PSA` | `20-PSAenglxxup.usfm` ✓ (LXX numbering; incl. Psalm 151) |
| 18 | Proverbs | `PRO` | `21-PROenglxxup.usfm` ✓ |
| 19 | Ecclesiastes | `ECC` | `22-ECCenglxxup.usfm` ✓ |
| 20 | Song of Songs | `SNG` | `23-SNGenglxxup.usfm` ✓ |
| 21 | Job | `JOB` | `19-JOBenglxxup.usfm` ✓ |
| 22 | Wisdom of Solomon | `WIS` | `45-WISenglxxup.usfm` ✓ |
| 23 | Wisdom of Sirach | `SIR` | `46-SIRenglxxup.usfm` ✓ |
| 24 | Esther | `EST` | `43-ESGenglxxup.usfm` — **`ESG`** "Esther (Greek)" ⚠ |
| 25 | Judith | `JDT` | `42-JDTenglxxup.usfm` ✓ |
| 26 | Tobit | `TOB` | `41-TOBenglxxup.usfm` ✓ |
| 27 | Hosea | `HOS` | `29-HOSenglxxup.usfm` ✓ |
| 28 | Amos | `AMO` | `31-AMOenglxxup.usfm` ✓ |
| 29 | Micah | `MIC` | `34-MICenglxxup.usfm` ✓ |
| 30 | Joel | `JOL` | `30-JOLenglxxup.usfm` ✓ |
| 31 | Obadiah | `OBA` | `32-OBAenglxxup.usfm` ✓ |
| 32 | Jonah | `JON` | `33-JONenglxxup.usfm` ✓ |
| 33 | Nahum | `NAM` | `35-NAMenglxxup.usfm` ✓ |
| 34 | Habakkuk | `HAB` | `36-HABenglxxup.usfm` ✓ |
| 35 | Zephaniah | `ZEP` | `37-ZEPenglxxup.usfm` ✓ |
| 36 | Haggai | `HAG` | `38-HAGenglxxup.usfm` ✓ |
| 37 | Zechariah | `ZEC` | `39-ZECenglxxup.usfm` ✓ |
| 38 | Malachi | `MAL` | `40-MALenglxxup.usfm` ✓ |
| 39 | Isaiah | `ISA` | `24-ISAenglxxup.usfm` ✓ |
| 40 | Jeremiah | `JER` | `25-JERenglxxup.usfm` ✓ |
| 41 | Baruch | `BAR` | `47-BARenglxxup.usfm` ✓ |
| 42 | Lamentations of Jeremiah | `LAM` | `26-LAMenglxxup.usfm` ✓ |
| 43 | Epistle of Jeremiah | `LJE` | `48-LJEenglxxup.usfm` ✓ |
| 44 | Ezekiel | `EZK` | `27-EZKenglxxup.usfm` ✓ |
| 45 | Daniel | `DAN` | `66-DAGenglxxup.usfm` — **`DAG`** "Daniel (Greek)" ⚠ |
| 46 | Susanna | `SUS` | `50-SUSenglxxup.usfm` ✓ |
| 47 | Bel and the Dragon | `BEL` | `51-BELenglxxup.usfm` ✓ |
| 48 | 1 Maccabees | `1MA` | `52-1MAenglxxup.usfm` ✓ |
| 49 | 2 Maccabees | `2MA` | `53-2MAenglxxup.usfm` ✓ |
| 50 | 3 Maccabees | `3MA` | `57-3MAenglxxup.usfm` ✓ |
| 51 | 4 Maccabees | `4MA` | `59-4MAenglxxup.usfm` ✓ |
| 52 | Prayer of Manasseh | `MAN` | `55-MANenglxxup.usfm` ✓ |

(`01-INTenglxxup.usfm` is front matter, not a book — skip it.)

## New Testament — `engtcent`

All codes match our canon one-to-one. (`engtcent` is NT-only.)

| Display name | Code | File | | Display name | Code | File |
|---|---|---|---|---|---|---|
| Matthew | `MAT` | `46-MATengtcent.usfm` | | 1 Timothy | `1TI` | `60-1TIengtcent.usfm` |
| Mark | `MRK` | `47-MRKengtcent.usfm` | | 2 Timothy | `2TI` | `61-2TIengtcent.usfm` |
| Luke | `LUK` | `48-LUKengtcent.usfm` | | Titus | `TIT` | `62-TITengtcent.usfm` |
| John | `JHN` | `49-JHNengtcent.usfm` | | Philemon | `PHM` | `63-PHMengtcent.usfm` |
| Acts | `ACT` | `50-ACTengtcent.usfm` | | Hebrews | `HEB` | `64-HEBengtcent.usfm` |
| Romans | `ROM` | `51-ROMengtcent.usfm` | | James | `JAS` | `65-JASengtcent.usfm` |
| 1 Corinthians | `1CO` | `52-1COengtcent.usfm` | | 1 Peter | `1PE` | `66-1PEengtcent.usfm` |
| 2 Corinthians | `2CO` | `53-2COengtcent.usfm` | | 2 Peter | `2PE` | `67-2PEengtcent.usfm` |
| Galatians | `GAL` | `54-GALengtcent.usfm` | | 1 John | `1JN` | `68-1JNengtcent.usfm` |
| Ephesians | `EPH` | `55-EPHengtcent.usfm` | | 2 John | `2JN` | `69-2JNengtcent.usfm` |
| Philippians | `PHP` | `56-PHPengtcent.usfm` | | 3 John | `3JN` | `70-3JNengtcent.usfm` |
| Colossians | `COL` | `57-COLengtcent.usfm` | | Jude | `JUD` | `71-JUDengtcent.usfm` |
| 1 Thessalonians | `1TH` | `58-1THengtcent.usfm` | | Revelation | `REV` | `72-REVengtcent.usfm` |
| 2 Thessalonians | `2TH` | `59-2THengtcent.usfm` | | | | |

(`01-INTengtcent.usfm` and `75–79-XX*engtcent.usfm` are intro/back matter — skip.)
