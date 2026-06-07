// Shared content for the Old Testament Feasts & Festivals page (and its layout prototypes).
// Quotes are pulled at build time from the base translations via the scripture mechanism
// (NT = BTV/TCENT, OT = ENGLXXUP); other passages are inline reference links. One source
// of truth so the several layout prototypes render identical content.

import { refLink, refPreview } from './scripture.ts';

/** Inline cross-reference link (same markup the {{ }}/ref: pipeline emits). */
function a(ref: string, label?: string): string {
  const l = refLink(ref);
  if (!l) throw new Error(`feasts-data: unresolved reference "${ref}"`);
  const prev = refPreview(ref);
  const attr = prev
    ? ` data-ref-preview="${prev.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`
    : '';
  return `<a class="xref" href="${l.href}"${attr}>${label ?? l.label}</a>`;
}

export type FeastPart = { type: 'p'; html: string } | { type: 'quote'; ref: string };

export interface Feast {
  /** English name(s) + Hebrew/Greek, may contain inline HTML. */
  names: string;
  date: string;
  body: FeastPart[];
}

export interface Season {
  id: string;
  heading: string;
  feasts: Feast[];
}

export const SEASONS: Season[] = [
  {
    id: 'fall',
    heading: 'Fall',
    feasts: [
      {
        names:
          '<strong>Festival of Trumpets</strong> / תרועה (<em>Teruah</em>) / רֹאשׁ הַשָּׁנָה (<em>Rosh haShanah</em>)',
        date: '1 Tishri (Sep/Oct)',
        body: [
          {
            type: 'p',
            html: 'This is the Jewish new year and beginning of the Jewish High Holy Days. The fall feasts are commemorated with trumpet blasts, and this feast is a day of rest. It occurs six months (lunar cycles) after Passover. Just as the trumpet (shofar) blasts indicate the new year, a trumpet blast will indicate Jesus’ return to inaugurate a new era of rest:',
          },
          { type: 'quote', ref: '1CO 15:52' },
        ],
      },
      {
        names: '<strong>Day of Atonement</strong> / יוֹם כִּפּוּר (<em>Yom Kippur</em>)',
        date: '10 Tishri (Sep/Oct)',
        body: [
          {
            type: 'p',
            html: 'The Sabbath of Sabbaths. The people fast and confess and repent of their sins committed against God and others. The high priest makes atonement for the people’s sins. This concludes the Jewish High Holy Days.',
          },
          { type: 'quote', ref: 'HEB 9:11-12' },
          {
            type: 'p',
            html: 'This was fulfilled by Jesus and therefore has no recurring equivalent in Orthodox feasts.',
          },
          { type: 'quote', ref: 'HEB 10:10' },
        ],
      },
      {
        names:
          '<strong>Booths</strong> / <strong>Tabernacles</strong> / Shelters / סֻכּוֹת (<em>Sukkot</em>) / σκηνοπηγία (<em>skēnopēgia</em>)',
        date: '15–21 Tishri (Sep/Oct)',
        body: [
          {
            type: 'p',
            html:
              'This feast commemorates God’s provision when wandering in the wilderness for 40 years. Jews live (or spend some time in) temporary shelters for the 7 days of this feast. Just as God was with the Israelites in the wilderness in the tabernacle, God tabernacled among humanity in Jesus (' +
              a('JHN 1:14', 'John 1:14') +
              ').',
          },
        ],
      },
    ],
  },
  {
    id: 'winter',
    heading: 'Winter',
    feasts: [
      {
        names:
          '<strong>Hanukkah</strong> / <strong>Lights</strong> / Dedication / חֲנֻכָּה (<em>Chanukkah</em>) / ἐγκαίνια (<em>Enkainia</em>)',
        date: '25–30 Kislev; 1–2 Tebeth (Nov/Dec/Jan)',
        body: [
          {
            type: 'p',
            html: 'Commemorates the eviction of Antiochus IV and the Seleucids and the purification and rededication of the Temple in Jerusalem by Judas Maccabeaus in 165 BC. This festival lasts 8 days.',
          },
        ],
      },
      {
        names: '<strong>Purim</strong> (פּוּרִים)',
        date: '14 Adar (Feb/Mar)',
        body: [{ type: 'p', html: 'Commemorates Esther’s deliverance of the Jewish people.' }],
      },
    ],
  },
  {
    id: 'spring',
    heading: 'Spring',
    feasts: [
      {
        names: '<strong>Passover</strong> / פֶּסַח (<em>Pesach</em>) / πάσχα (<em>Pascha</em>)',
        date: '14 Nisan (Mar/Apr)',
        body: [
          {
            type: 'p',
            html:
              'God delivered His people out of slavery in Egypt, and the angel of death “passed over” their firstborn sons when they put the blood of the sacrificial lamb on their doorposts. Sts. John, Peter, and Paul associated Jesus with the Passover lamb, whose blood spares humanity from death (e.g., ' +
              a('JHN 1:29', 'John 1:29') +
              '; ' +
              a('1CO 5:7', '1 Corinthians 5:7') +
              '; ' +
              a('1PE 1:19', '1 Peter 1:19') +
              '). The Orthodox Church celebrates Pascha, wherein Christ offers Himself as the lamb of God who delivers us from slavery to death by defeating it through His own death.',
          },
        ],
      },
      {
        names:
          '<strong>Unleavened Bread</strong> / מַצֹּ֥ות (<em>Matzot</em>) / ἑορτὴ τῶν ἀζύμων (<em>heortē tōn azymōn</em>)',
        date: '15–21 Nisan (Mar/Apr)',
        body: [
          {
            type: 'p',
            html:
              'Connected to the feast of Passover, and was seen as synonymous with it by NT authors (e.g., ' +
              a('MAT 26:17', 'Matthew 26:17') +
              '; ' +
              a('MRK 14:2', 'Mark 14:2') +
              ', ' +
              a('MRK 14:12', '12') +
              '; ' +
              a('LUK 22:1', 'Luke 22:1') +
              ', ' +
              a('LUK 22:7', '7') +
              '; ' +
              a('JHN 13:1', 'John 13:1') +
              ', ' +
              a('JHN 13:4', '4') +
              '; ' +
              a('JHN 18:28', '18:28') +
              '; ' +
              a('ACT 12:3', 'Acts 12:3') +
              ', ' +
              a('ACT 12:4', '4') +
              '). The Jews did not use leaven for 7 days, and this was also connected to the barley harvest (Feast of First Fruits).',
          },
          { type: 'quote', ref: '1CO 5:7-8' },
        ],
      },
      {
        names:
          '<strong>First Fruits</strong> / Harvest / בִּכּוּרִ֖ים (<em>Bikkurim</em>) / ראשׁית הקציר (<em>Reshit haKatzvir</em>)',
        date: '16/22 Nisan (Mar/Apr)',
        body: [
          {
            type: 'p',
            html:
              'This either took place the day following the Feast of Unleavened Bread or on the third day of the Feast of Unleavened Bread / Passover, and is also broadly connected to Passover in the NT. This feast thanks God for the fertility of the land. ' +
              a('LEV 23:10-11', 'Leviticus 23:10–11') +
              ' describes the offering of the firstfruits to the priest:',
          },
          { type: 'quote', ref: 'LEV 23:10-11' },
          {
            type: 'p',
            html: 'Read as a reference to this feast, the wave offering aligns with the Lord’s Day (Sunday); so just as the firstfruits of the harvest were presented to God, this is also the day that Jesus rose from the dead:',
          },
          { type: 'quote', ref: '1CO 15:20' },
        ],
      },
      {
        names:
          '<strong>Weeks</strong> / <strong>Pentecost</strong> / שָׁבוּעוֹת (<em>Shavuot</em>) / πεντηκοστή (<em>Pentecosti</em>)',
        date: '6 Sivan (May/Jun)',
        body: [
          {
            type: 'p',
            html: 'Commemorates receiving God’s Law on Mt. Sinai and is connected to the wheat harvest. The Israelites baked <em>leavened</em> bread. This takes place 7 weeks / 50 days after the feast of First Fruits. Likewise, the Orthodox Church celebrates Pentecost 50 days after Pascha.',
          },
          { type: 'p', html: 'The harvest imagery carries into the New Testament:' },
          { type: 'quote', ref: 'MAT 9:37-38' },
          {
            type: 'p',
            html: 'At the feast of Pentecost, God began pouring out His Spirit on all people, Jews and Gentiles, and thereby began to gather the full harvest of His people.',
          },
        ],
      },
    ],
  },
];
