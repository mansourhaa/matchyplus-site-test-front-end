import sitemap from '@/app/sitemap';
import { pressItems } from '@/components/matchy/press-data';
import { SUPPORTED_LOCALES } from '@/features/i18n/messages';
import { describe, expect, it } from 'vitest';

import { PAGES, type PageKey, faqJsonLd, homeJsonLd, pageMetadata, servicesJsonLd } from './seo';

describe('home page metadata', () => {
  it('uses the reference copy of each language', () => {
    expect(pageMetadata('fr', 'home')).toMatchObject({
      title: { absolute: 'Matchy+ | Trouvez un professionnel près de chez vous' },
      description:
        'Trouvez facilement des professionnels, artisans et prestataires près de chez vous avec Matchy+. Explorez les profils et entrez directement en contact.',
    });
    expect(pageMetadata('en', 'home')).toMatchObject({
      title: { absolute: 'Matchy+ | Find a professional near you' },
    });
    expect(pageMetadata('ar', 'home')).toMatchObject({
      title: { absolute: 'Matchy+ | اعثر على مهني بالقرب منك' },
    });
  });

  it('declares a self canonical and every translation with x-default on French', () => {
    const { alternates } = pageMetadata('en', 'home');
    expect(alternates?.canonical).toBe('https://matchyplus.com/en/');
    expect(alternates?.languages).toEqual({
      fr: 'https://matchyplus.com/fr/',
      en: 'https://matchyplus.com/en/',
      ar: 'https://matchyplus.com/ar/',
      'x-default': 'https://matchyplus.com/fr/',
    });
  });
});

describe('every page', () => {
  const keys = Object.keys(PAGES) as PageKey[];

  it('has a title and description of its own in each language', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const key of keys) {
      for (const locale of SUPPORTED_LOCALES) {
        const { title, description } = PAGES[key].copy[locale];
        titles.add(title);
        descriptions.add(description);
      }
    }
    expect(titles.size).toBe(keys.length * SUPPORTED_LOCALES.length);
    expect(descriptions.size).toBe(keys.length * SUPPORTED_LOCALES.length);
  });

  it('marks only utility pages as noindex', () => {
    expect(pageMetadata('fr', 'suppression-compte').robots).toEqual({ index: false, follow: true });
    expect(pageMetadata('fr', 'coming-soon').robots).toEqual({ index: false, follow: true });
    expect(pageMetadata('fr', 'faq').robots).toBeUndefined();
  });
});

describe('sitemap', () => {
  const entries = sitemap();

  it('lists each indexable page once per language on the public domain', () => {
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    const articles = pressItems().filter((item) => !item.sample);
    expect(urls).toHaveLength((11 + articles.length) * SUPPORTED_LOCALES.length);
    // every date is real, including news dated by month or by year only
    for (const entry of entries) {
      expect(Number.isNaN(new Date(entry.lastModified ?? '').getTime())).toBe(false);
    }
    for (const item of articles) {
      expect(urls).toContain(`https://matchyplus.com/fr/actualites/${item.slug}/`);
    }
    expect(urls).toContain(`https://matchyplus.com${encodeURI('/ar/الأسئلة-الشائعة/')}`);
    expect(urls.every((url) => url.startsWith('https://matchyplus.com/'))).toBe(true);
  });

  it('leaves out noindex pages', () => {
    const urls = entries.map((entry) => entry.url).join(' ');
    expect(urls).not.toContain('suppression-compte');
    expect(urls).not.toContain('coming-soon');
  });

  it('links each entry to its translations', () => {
    const faq = entries.find((entry) => entry.url === 'https://matchyplus.com/fr/faq/');
    expect(faq?.alternates?.languages).toMatchObject({
      en: 'https://matchyplus.com/en/faq/',
      ar: `https://matchyplus.com${encodeURI('/ar/الأسئلة-الشائعة/')}`,
    });
  });
});

describe('structured data', () => {
  it('describes the organization and the localized website, with no invented ratings', () => {
    const graph = homeJsonLd('ar')['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual(['Organization', 'WebSite']);
    expect(graph[1]).toMatchObject({ url: 'https://matchyplus.com/ar/', inLanguage: 'ar' });
    expect(JSON.stringify(graph)).not.toMatch(/Rating|Review/);
  });
});

describe('FAQ structured data', () => {
  it('lists every question shown on the page', () => {
    const data = faqJsonLd('fr');
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(20);
    expect(data.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'Qu’est-ce que Matchy+ ?',
    });
  });
});

describe('Services structured data', () => {
  it('lists the categories without presenting Matchy+ as their provider', () => {
    const graph = servicesJsonLd('en')['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual(['CollectionPage', 'ItemList', 'FAQPage']);
    expect(JSON.stringify(graph)).not.toContain('"Service"');
  });
});
