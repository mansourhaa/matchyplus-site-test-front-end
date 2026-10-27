import { SUPPORTED_LOCALES } from '@/features/i18n/messages';
import { localizePath } from '@/features/i18n/routing';
import { PAGES, absoluteUrl, languageAlternates } from '@/lib/seo';
import type { MetadataRoute } from 'next';

/** Every indexable page in every language, each entry listing its translations (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return Object.values(PAGES)
    .filter((page) => !page.noindex)
    .flatMap((page) =>
      SUPPORTED_LOCALES.map((locale) => ({
        url: absoluteUrl(localizePath(locale, page.path)),
        lastModified,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages: languageAlternates(page.path) },
      })),
    );
}
