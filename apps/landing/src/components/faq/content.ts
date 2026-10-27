import faqAr from '@/locales/ar/faq.json';
import faqEn from '@/locales/en/faq.json';
import faqFr from '@/locales/fr/faq.json';

import type { FaqContent, SupportedLocale } from './types';

export const FAQ_CONTENT: Record<SupportedLocale, FaqContent> = {
  fr: faqFr,
  en: faqEn,
  ar: faqAr,
};
