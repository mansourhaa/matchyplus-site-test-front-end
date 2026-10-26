import { DEFAULT_LOCALE } from '@/features/i18n/messages';
import {
  LOCALE_COOKIE,
  isLocale,
  localizePath,
  negotiateLocale,
  splitLocale,
} from '@/features/i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Every page lives under `/fr/`, `/en/` or `/ar/`, so each language has its own indexable URL.
 * Locale-less URLs (`/`, the pre-i18n `/faq`, member-app links carrying `?lang=`) are redirected
 * to their localized equivalent.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (splitLocale(pathname).locale) return NextResponse.next();

  // A plain URL keeps the trailing slash exactly as localizePath builds it.
  const url = new URL(request.url);
  const requested = searchParams.get('lang');
  url.searchParams.delete('lang');

  // An explicit `?lang=` always lands on the same page, so the redirect can be permanent.
  if (isLocale(requested)) {
    url.pathname = localizePath(requested, pathname);
    return NextResponse.redirect(url, 308);
  }

  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(remembered)
    ? remembered
    : (negotiateLocale(request.headers.get('accept-language')) ?? DEFAULT_LOCALE);
  url.pathname = localizePath(locale, pathname);
  // The target depends on the visitor, so the redirect stays temporary and says what it varies on.
  const response = NextResponse.redirect(url, 307);
  response.headers.set('Vary', 'Accept-Language, Cookie');
  return response;
}

export const config = {
  // Skips Next internals and anything with a file extension: sitemap.xml, robots.txt,
  // manifest, icons, images and /.well-known/security.txt.
  matcher: ['/((?!_next/|.*\\.[^/]+$).*)'],
};
