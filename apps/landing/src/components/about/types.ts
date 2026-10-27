export type SupportedLocale = 'fr' | 'en' | 'ar';
export type AboutAction = { label: string; href: string };
export type AboutContent = {
  seo: { title: string; description: string; openGraphTitle: string; openGraphDescription: string };
  hero: { eyebrow: string; title: string; text: string; actions: AboutAction[] };
  sections: Array<{ id: string; title: string; text: string }>;
  principles: { title: string; items: Array<{ id: string; title: string; text: string }> };
  faq: { title: string; items: Array<{ id: string; question: string; answer: string }> };
  finalCta: { title: string; text: string; actions: AboutAction[] };
};
