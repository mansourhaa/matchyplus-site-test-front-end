import { pressItems } from '@/components/matchy/press-data';
import { SUPPORTED_LOCALES } from '@/features/i18n/messages';
import { localizePath } from '@/features/i18n/routing';
import { PAGES, absoluteUrl, languageAlternates } from '@/lib/seo';
import type { MetadataRoute } from 'next';

/** Every indexable page and news article in every language, each listing its translations. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages = Object.values(PAGES)
    .filter((page) => !page.noindex)
    .map((page) => ({ ...page, lastModified }));
  // real news articles (sample ones stay out, like their noindex)
  const articles = pressItems()
    .filter((item) => !item.sample)
    .map((item) => ({
      path: `/actualites/${item.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      lastModified: new Date(`${item.date.length === 7 ? `${item.date}-01` : item.date}T12:00:00Z`),
    }));
  return [...pages, ...articles].flatMap((page) =>
    SUPPORTED_LOCALES.map((locale) => ({
      url: absoluteUrl(localizePath(locale, page.path)),
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages: languageAlternates(page.path) },
    })),
  );
}
