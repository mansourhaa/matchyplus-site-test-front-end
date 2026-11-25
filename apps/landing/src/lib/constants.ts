export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
  /\/+$/,
  '',
);

export const APP_LOGIN_URL = `${APP_URL}/connexion`;
export const APP_REGISTER_URL = `${APP_URL}/register`;

/**
 * An app link that opens in the visitor's language: adds `lang` (fr, en or ar), which the app reads
 * and keeps (apps/app i18n-provider). The app is another site, so it cannot see the landing's
 * language otherwise and would open in English.
 */
export function appLink(url: string, locale: string): string {
  const link = new URL(url);
  link.searchParams.set('lang', locale);
  return link.toString();
}

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/matchyplus/',
  facebook: 'https://www.facebook.com/matchyplus',
  linkedin: 'https://www.linkedin.com/company/matchyplus',
} as const;
