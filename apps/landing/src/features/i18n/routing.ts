import { type Locale, SUPPORTED_LOCALES } from '@/features/i18n/messages';

/** Remembers the last language a visitor picked so the proxy can send `/` straight to it. */
export const LOCALE_COOKIE = 'matchy_locale';

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as string[]).includes(value);
}

export function localeDir(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Pages whose URL slug is translated, keyed by their route folder under `app/[lang]/`.
 * The proxy rewrites each translated slug to that folder.
 */
const LOCALIZED_SLUGS: Record<string, Record<Locale, string>> = {
  '/a-propos': { fr: '/a-propos', en: '/about-us', ar: '/من-نحن' },
  '/faq': { fr: '/faq', en: '/faq', ar: '/الأسئلة-الشائعة' },
  '/services': { fr: '/services', en: '/services', ar: '/الخدمات' },
  // addresses from the "Story Matchy" document
  '/a-propos/histoire-matchy-plus': {
    fr: '/a-propos/histoire-matchy-plus',
    en: '/about/matchy-plus-story',
    ar: '/about/matchy-plus-story',
  },
};

/** Route folder of a path, whatever language its slug is in: `/about-us` → `/a-propos`. */
export function routePath(path: string): string {
  for (const [route, slugs] of Object.entries(LOCALIZED_SLUGS)) {
    if (Object.values(slugs).includes(path)) return route;
  }
  return path;
}

/**
 * Prefixes a path with its locale and translates its slug, ending in the slash
 * `trailingSlash: true` serves pages on: `/` → `/fr/`, `/faq` → `/fr/faq/`, `/#how` → `/fr/#how`,
 * `/a-propos` → `/en/about-us/`.
 */
export function localizePath(locale: Locale, path = '/'): string {
  const hashIndex = path.indexOf('#');
  const pathname = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  const route = routePath(`/${pathname.replace(/^\/+|\/+$/g, '')}`);
  const segments = (LOCALIZED_SLUGS[route]?.[locale] ?? route).slice(1);
  return `/${locale}/${segments ? `${segments}/` : ''}${hash}`;
}

/** Splits `/en/faq/` into `{ locale: 'en', path: '/faq' }`; `locale` is null on a locale-less path. */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const [, first, ...rest] = safeDecode(pathname).split('/');
  if (!isLocale(first)) return { locale: null, path: pathname };
  return { locale: first, path: `/${rest.join('/')}`.replace(/\/+$/, '') || '/' };
}

/** Request pathnames arrive percent-encoded (`/ar/%D9%85…`); slugs are compared decoded. */
function safeDecode(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/** The same page in another language: `/fr/faq/` → `/en/faq/`, `/fr/a-propos/` → `/en/about-us/`. */
export function switchLocalePath(pathname: string, locale: Locale): string {
  return localizePath(locale, splitLocale(pathname).path);
}

/** Best supported locale in an `Accept-Language` header, by q-value then header order. */
export function negotiateLocale(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const quality = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
      return {
        language: tag.split('-')[0].toLowerCase(),
        q: quality ? Number(quality.slice(2)) : 1,
      };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.map((entry) => entry.language).find(isLocale) ?? null;
}
