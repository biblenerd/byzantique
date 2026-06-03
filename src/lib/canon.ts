// Canon registry — the single source of truth for book order, display names,
// slugs, and USFM codes. Mirrors REQUIREMENTS.md Appendix A.
//
// Binding rules (REQUIREMENTS.md §3):
//  - LXX/Orthodox names are primary; traditional name shown in parentheses.
//  - Never use "apocrypha"/"deuterocanonical" — the term is *Anagignoskomena*.
//
// NOTE (Phase 0): only GEN has built text so far. USFM `code` values for the
// other books are provisional and verified against ENGLXXUP in Phase 1
// (open item #4). `built` marks books whose text JSON exists.

export type Testament = 'ot' | 'nt';

export interface Book {
  code: string; // USFM book code (stable internal key)
  name: string; // primary LXX/Orthodox display name
  paren?: string; // traditional Hebrew/Protestant name (shown in parentheses)
  slug: string; // URL slug
  testament: Testament;
  anag?: boolean; // Anagignoskomenon
  built?: boolean; // text JSON has been generated
  chips?: string[]; // grouping chips (computed from GROUPS below)
  status?: { label: string; kind: 'anag' | 'homologoumena' | 'antilegomena' }; // colored canonical-status chip
}

export const OT_BOOKS: Book[] = [
  { code: 'GEN', name: 'Genesis', slug: 'genesis', testament: 'ot', built: true },
  { code: 'EXO', name: 'Exodus', slug: 'exodus', testament: 'ot' },
  { code: 'LEV', name: 'Leviticus', slug: 'leviticus', testament: 'ot' },
  { code: 'NUM', name: 'Numbers', slug: 'numbers', testament: 'ot' },
  { code: 'DEU', name: 'Deuteronomy', slug: 'deuteronomy', testament: 'ot' },
  { code: 'JOS', name: 'Joshua', slug: 'joshua', testament: 'ot' },
  { code: 'JDG', name: 'Judges', slug: 'judges', testament: 'ot' },
  { code: 'RUT', name: 'Ruth', slug: 'ruth', testament: 'ot' },
  { code: '1SA', name: '1 Kingdoms', paren: '1 Samuel', slug: '1-kingdoms', testament: 'ot' },
  { code: '2SA', name: '2 Kingdoms', paren: '2 Samuel', slug: '2-kingdoms', testament: 'ot' },
  { code: '1KI', name: '3 Kingdoms', paren: '1 Kings', slug: '3-kingdoms', testament: 'ot' },
  { code: '2KI', name: '4 Kingdoms', paren: '2 Kings', slug: '4-kingdoms', testament: 'ot' },
  { code: '1CH', name: '1 Supplements', paren: 'Chronicles', slug: '1-supplements', testament: 'ot' },
  { code: '2CH', name: '2 Supplements', paren: 'Chronicles', slug: '2-supplements', testament: 'ot' },
  { code: '1ES', name: 'Esdras A', slug: 'esdras-a', testament: 'ot', anag: true }, // ENGLXXUP 1ES = "Esdras I"
  { code: 'EZR', name: 'Esdras B', slug: 'esdras-b', testament: 'ot' }, // ENGLXXUP EZR = "Ezra and Nehemiah" (23 ch, already combined)
  { code: 'PSA', name: 'Psalms', slug: 'psalms', testament: 'ot' },
  { code: 'PRO', name: 'Proverbs', slug: 'proverbs', testament: 'ot' },
  { code: 'ECC', name: 'Ecclesiastes', slug: 'ecclesiastes', testament: 'ot' },
  { code: 'SNG', name: 'Song of Songs', slug: 'song-of-songs', testament: 'ot' },
  { code: 'JOB', name: 'Job', slug: 'job', testament: 'ot' },
  { code: 'WIS', name: 'Wisdom of Solomon', slug: 'wisdom-of-solomon', testament: 'ot', anag: true },
  { code: 'SIR', name: 'Wisdom of Sirach', slug: 'wisdom-of-sirach', testament: 'ot', anag: true },
  { code: 'EST', name: 'Esther', slug: 'esther', testament: 'ot' }, // ENGLXXUP source id = ESG (Esther Greek)
  { code: 'JDT', name: 'Judith', slug: 'judith', testament: 'ot', anag: true },
  { code: 'TOB', name: 'Tobit', slug: 'tobit', testament: 'ot', anag: true },
  { code: 'HOS', name: 'Hosea', slug: 'hosea', testament: 'ot' },
  { code: 'AMO', name: 'Amos', slug: 'amos', testament: 'ot' },
  { code: 'MIC', name: 'Micah', slug: 'micah', testament: 'ot' },
  { code: 'JOL', name: 'Joel', slug: 'joel', testament: 'ot' },
  { code: 'OBA', name: 'Obadiah', slug: 'obadiah', testament: 'ot' },
  { code: 'JON', name: 'Jonah', slug: 'jonah', testament: 'ot' },
  { code: 'NAM', name: 'Nahum', slug: 'nahum', testament: 'ot' },
  { code: 'HAB', name: 'Habakkuk', slug: 'habakkuk', testament: 'ot' },
  { code: 'ZEP', name: 'Zephaniah', slug: 'zephaniah', testament: 'ot' },
  { code: 'HAG', name: 'Haggai', slug: 'haggai', testament: 'ot' },
  { code: 'ZEC', name: 'Zechariah', slug: 'zechariah', testament: 'ot' },
  { code: 'MAL', name: 'Malachi', slug: 'malachi', testament: 'ot' },
  { code: 'ISA', name: 'Isaiah', slug: 'isaiah', testament: 'ot' },
  { code: 'JER', name: 'Jeremiah', slug: 'jeremiah', testament: 'ot' },
  { code: 'BAR', name: 'Baruch', slug: 'baruch', testament: 'ot', anag: true },
  { code: 'LAM', name: 'Lamentations of Jeremiah', slug: 'lamentations', testament: 'ot' },
  { code: 'LJE', name: 'Epistle of Jeremiah', slug: 'epistle-of-jeremiah', testament: 'ot', anag: true },
  { code: 'EZK', name: 'Ezekiel', slug: 'ezekiel', testament: 'ot' },
  { code: 'DAN', name: 'Daniel', slug: 'daniel', testament: 'ot' }, // ENGLXXUP source id = DAG (Daniel Greek)
  { code: 'SUS', name: 'Susanna', slug: 'susanna', testament: 'ot', anag: true },
  { code: 'BEL', name: 'Bel and the Dragon', slug: 'bel-and-the-dragon', testament: 'ot', anag: true },
  { code: '1MA', name: '1 Maccabees', slug: '1-maccabees', testament: 'ot', anag: true },
  { code: '2MA', name: '2 Maccabees', slug: '2-maccabees', testament: 'ot', anag: true },
  { code: '3MA', name: '3 Maccabees', slug: '3-maccabees', testament: 'ot', anag: true },
  { code: '4MA', name: '4 Maccabees', slug: '4-maccabees', testament: 'ot', anag: true },
  { code: 'MAN', name: 'Prayer of Manasseh', slug: 'prayer-of-manasseh', testament: 'ot', anag: true },
];

export const NT_BOOKS: Book[] = [
  { code: 'MAT', name: 'Matthew', slug: 'matthew', testament: 'nt' },
  { code: 'MRK', name: 'Mark', slug: 'mark', testament: 'nt' },
  { code: 'LUK', name: 'Luke', slug: 'luke', testament: 'nt' },
  { code: 'JHN', name: 'John', slug: 'john', testament: 'nt' },
  { code: 'ACT', name: 'Acts', slug: 'acts', testament: 'nt' },
  { code: 'ROM', name: 'Romans', slug: 'romans', testament: 'nt' },
  { code: '1CO', name: '1 Corinthians', slug: '1-corinthians', testament: 'nt' },
  { code: '2CO', name: '2 Corinthians', slug: '2-corinthians', testament: 'nt' },
  { code: 'GAL', name: 'Galatians', slug: 'galatians', testament: 'nt' },
  { code: 'EPH', name: 'Ephesians', slug: 'ephesians', testament: 'nt' },
  { code: 'PHP', name: 'Philippians', slug: 'philippians', testament: 'nt' },
  { code: 'COL', name: 'Colossians', slug: 'colossians', testament: 'nt' },
  { code: '1TH', name: '1 Thessalonians', slug: '1-thessalonians', testament: 'nt' },
  { code: '2TH', name: '2 Thessalonians', slug: '2-thessalonians', testament: 'nt' },
  { code: '1TI', name: '1 Timothy', slug: '1-timothy', testament: 'nt' },
  { code: '2TI', name: '2 Timothy', slug: '2-timothy', testament: 'nt' },
  { code: 'TIT', name: 'Titus', slug: 'titus', testament: 'nt' },
  { code: 'PHM', name: 'Philemon', slug: 'philemon', testament: 'nt' },
  { code: 'HEB', name: 'Hebrews', slug: 'hebrews', testament: 'nt' },
  { code: 'JAS', name: 'James', slug: 'james', testament: 'nt' },
  { code: '1PE', name: '1 Peter', slug: '1-peter', testament: 'nt' },
  { code: '2PE', name: '2 Peter', slug: '2-peter', testament: 'nt' },
  { code: '1JN', name: '1 John', slug: '1-john', testament: 'nt' },
  { code: '2JN', name: '2 John', slug: '2-john', testament: 'nt' },
  { code: '3JN', name: '3 John', slug: '3-john', testament: 'nt' },
  { code: 'JUD', name: 'Jude', slug: 'jude', testament: 'nt' },
  { code: 'REV', name: 'Revelation', slug: 'revelation', testament: 'nt' },
];

export const BOOKS: Book[] = [...OT_BOOKS, ...NT_BOOKS];

// --- Grouping chips ---------------------------------------------------------
// A book shows the chips whose group lists its code. Edit GROUPS to (re)tag.
// CHIP_ORDER controls the left-to-right display order (Anagignoskomenon chip,
// rendered by the page, always comes last).
const PENT = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'];
const FORMER = ['JOS', 'JDG', '1SA', '2SA', '1KI', '2KI'];
const TWELVE = ['HOS', 'AMO', 'MIC', 'JOL', 'OBA', 'JON', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'];

const GROUPS: Record<string, string[]> = {
  Pentateuch: PENT,
  Law: PENT,
  Torah: PENT,
  History: ['JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', '1ES', 'EZR', 'EST', 'JDT', 'TOB', '1MA', '2MA', '3MA', '4MA'],
  Prophecy: [...FORMER, ...TWELVE, 'ISA', 'JER', 'BAR', 'LAM', 'LJE', 'EZK', 'DAN', 'SUS', 'BEL'],
  'Former Prophet': FORMER,
  'Latter Prophet': ['ISA', 'JER', 'EZK'],
  '12 Prophets': TWELVE,
  // "Nehemiah" maps to Esdras B (EZR) in our canon (Ezra + Nehemiah combined).
  Writing: ['PSA', 'PRO', 'JOB', 'DAN', 'EZR', '1ES', '1CH', '2CH'],
  Poetic: ['PSA', 'PRO', 'ECC', 'SNG', 'JOB', 'WIS', 'SIR'],
  '5 Scrolls (Megillot)': ['SNG', 'RUT', 'LAM', 'ECC', 'EST'],

  // New Testament groupings.
  Gospel: ['MAT', 'MRK', 'LUK', 'JHN'],
  'Letter / Epistle': ['ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD'],
  Pauline: ['ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB'],
  'General (Catholic)': ['HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD'],
  Petrine: ['1PE', '2PE'],
  Johannine: ['JHN', '1JN', '2JN', '3JN', 'REV'],
};

const CHIP_ORDER = [
  'Pentateuch', 'Law', 'Torah',
  'History',
  'Prophecy', 'Former Prophet', 'Latter Prophet', '12 Prophets',
  'Writing', 'Poetic', '5 Scrolls (Megillot)',
  'Gospel', 'Letter / Epistle', 'Pauline', 'General (Catholic)', 'Petrine', 'Johannine',
];

// Canonical-status chips (colored, rendered last): the OT Anagignoskomena and the
// NT Homologoumena (green) / Antilegomena (amber, like the Anagignoskomena).
const HOMOLOGOUMENA = ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', '1PE', '1JN'];
const ANTILEGOMENA = ['HEB', 'JAS', '2PE', '2JN', '3JN', 'JUD', 'REV'];

for (const b of BOOKS) {
  const chips = CHIP_ORDER.filter((label) => GROUPS[label]?.includes(b.code));
  if (chips.length) b.chips = chips;

  if (b.anag) b.status = { label: 'Anagignoskomenon', kind: 'anag' };
  else if (HOMOLOGOUMENA.includes(b.code)) b.status = { label: 'Homologoumenon', kind: 'homologoumena' };
  else if (ANTILEGOMENA.includes(b.code)) b.status = { label: 'Antilegomenon', kind: 'antilegomena' };
}

// --- lookups ----------------------------------------------------------------
const byCodeMap = new Map(BOOKS.map((b) => [b.code, b]));
const bySlugMap = new Map(BOOKS.map((b) => [`${b.testament}/${b.slug}`, b]));

export const bookByCode = (code: string): Book | undefined => byCodeMap.get(code);
export const bookBySlug = (testament: Testament, slug: string): Book | undefined =>
  bySlugMap.get(`${testament}/${slug}`);

/** Display name with optional parenthetical traditional name. */
export const bookLabel = (b: Book): string => (b.paren ? `${b.name} (${b.paren})` : b.name);
