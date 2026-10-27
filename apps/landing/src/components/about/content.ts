import aboutAr from '@/locales/ar/about.json';
import aboutEn from '@/locales/en/about.json';
import aboutFr from '@/locales/fr/about.json';

import type { AboutContent, SupportedLocale } from './types';

export const ABOUT_CONTENT: Record<SupportedLocale, AboutContent> = {
  fr: aboutFr,
  en: aboutEn,
  ar: aboutAr,
};
