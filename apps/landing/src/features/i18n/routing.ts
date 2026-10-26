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
 * Prefixes a path with its locale, ending in the slash `trailingSlash: true` serves pages on:
 * `/` → `/fr/`, `/faq` → `/fr/faq/`, `/#how` → `/fr/#how`.
 */
export function localizePath(locale: Locale, path = '/'): string {
  const hashIndex = path.indexOf('#');
  const pathname = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  const segments = pathname.replace(/^\/+|\/+$/g, '');
  return `/${locale}/${segments ? `${segments}/` : ''}${hash}`;
}

/** Splits `/en/faq/` into `{ locale: 'en', path: '/faq' }`; `locale` is null on a locale-less path. */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const [, first, ...rest] = pathname.split('/');
  if (!isLocale(first)) return { locale: null, path: pathname };
  return { locale: first, path: `/${rest.join('/')}`.replace(/\/+$/, '') || '/' };
}

/** The same page in another language: `/fr/faq/` → `/en/faq/`. */
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
