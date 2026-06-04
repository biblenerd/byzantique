Self-hosted web fonts — Byzantique
==================================

These subsetted .woff2 files are used to render polytonic Greek and pointed
Hebrew in scripture text, intros, and UI. Each is scoped by CSS unicode-range
in src/styles/global.css so it loads only on pages containing that script.

Fonts
-----
Noto Serif  — polytonic Greek (Greek + Greek Extended subsets, roman & italic)
  noto-serif-greek.woff2, noto-serif-greekext.woff2,
  noto-serif-greek-italic.woff2, noto-serif-greekext-italic.woff2
  CSS family alias: "Noto Serif Greek" (to avoid clashing with any system Noto Serif)
  © The Noto Project Authors. Subsets of the Google Fonts build.

Ezra SIL    — pointed/cantillated biblical Hebrew, fashioned after the typography of
  Biblia Hebraica Stuttgartensia (BHS). Hebrew block + presentation forms; one weight
  (bold is browser-synthesized for the rare case).
  ezra-sil-hebrew.woff2 — a Hebrew-only subset (woff2) of Ezra SIL 2.51 (SILEOT.ttf).
  © SIL International. See EzraSIL-OFL.txt for the full license + copyright.
  Source: https://software.sil.org/ezra/

License
-------
All families here are licensed under the SIL Open Font License, Version 1.1.
Full text: https://openfontlicense.org  (or https://scripts.sil.org/OFL)
Noto source: https://github.com/notofonts (latin-greek-cyrillic)

The .woff2 files are subsets created for web delivery. The OFL permits bundling,
subsetting, and redistribution under its terms (see EzraSIL-OFL.txt).
