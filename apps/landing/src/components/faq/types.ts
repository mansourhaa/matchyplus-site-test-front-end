export type SupportedLocale = 'fr' | 'en' | 'ar';

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  items: FaqItem[];
};

export type FaqContent = {
  seo: { title: string; description: string };
  hero: { title: string; introduction: string };
  search: { label: string; placeholder: string; noResults: string };
  categories: FaqCategory[];
  contact: { title: string; description: string; label: string; href: string };
};
