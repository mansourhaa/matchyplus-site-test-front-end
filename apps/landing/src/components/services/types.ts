export type SupportedLocale = 'fr' | 'en' | 'ar';
export type Action = { label: string; href: string };
export type ServicesContent = {
  seo: { title: string; description: string; openGraphTitle: string; openGraphDescription: string };
  hero: { eyebrow: string; title: string; text: string; actions: Action[] };
  popular: {
    title: string;
    text: string;
    services: Array<{
      id: string;
      name: string;
      description: string;
      features: string[];
      action: Action;
    }>;
  };
  howItWorks: { title: string; steps: Array<{ id: string; title: string; text: string }> };
  professionalCta: { title: string; text: string; action: Action };
  clarity: { title: string; text: string };
  cities: { title: string; text: string; items: string[] };
  faq: { title: string; items: Array<{ id: string; question: string; answer: string }> };
  finalCta: { title: string; text: string; actions: Action[] };
};
