export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
  /\/+$/,
  '',
);

export const APP_LOGIN_URL = `${APP_URL}/connexion`;
export const APP_REGISTER_URL = `${APP_URL}/onboarding`;

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/matchyplus/',
  facebook: 'https://www.facebook.com/matchyplus',
  linkedin: 'https://www.linkedin.com/company/matchyplus',
} as const;
