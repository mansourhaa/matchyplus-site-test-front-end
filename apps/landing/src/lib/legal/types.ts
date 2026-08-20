export type LegalLocale = 'ar' | 'en' | 'fr';

export type LegalSection = { title: string; content: string };

export type LegalDocument = {
  pageTitle: string;
  heading: string;
  subheading: string;
  sections: LegalSection[];
  footer: string;
};

export function parseLegalLocale(value: string | string[] | undefined): LegalLocale {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'ar' || raw === 'en' || raw === 'fr') return raw;
  return 'fr';
}
