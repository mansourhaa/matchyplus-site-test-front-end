/**
 * Absolute URL helpers for the marketing site (legal docs live there).
 */
export function getLandingBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_LANDING_URL?.replace(/\/+$/, '') ||
    process.env.LANDING_URL?.replace(/\/+$/, '') ||
    'http://localhost:3002'
  );
}

/** Build a landing URL, optionally carrying the app locale as `?lang=`. */
export function landingPath(path: string, locale?: string): string {
  const base = getLandingBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalized, `${base}/`);
  if (locale === 'ar' || locale === 'en' || locale === 'fr') {
    url.searchParams.set('lang', locale);
  }
  return url.toString();
}
