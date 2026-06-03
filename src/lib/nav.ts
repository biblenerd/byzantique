// Site navigation config.
// About section + its submenu (REQUIREMENTS.md §6/§7 custom pages).

export interface NavPage {
  title: string;
  slug: string;
}

export const ABOUT_PAGES: NavPage[] = [
  { title: 'Texts and Translations', slug: 'texts-and-translations' },
  { title: 'Approach', slug: 'approach' },
  { title: 'Abbreviations', slug: 'abbreviations' },
  { title: 'FAQs', slug: 'faqs' },
];
