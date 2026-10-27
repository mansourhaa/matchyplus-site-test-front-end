import servicesAr from '@/locales/ar/services.json';
import servicesEn from '@/locales/en/services.json';
import servicesFr from '@/locales/fr/services.json';

import type { ServicesContent, SupportedLocale } from './types';

export const SERVICES_CONTENT: Record<SupportedLocale, ServicesContent> = {
  fr: servicesFr,
  en: servicesEn,
  ar: servicesAr,
};
