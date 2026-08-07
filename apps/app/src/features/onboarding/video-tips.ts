export type VoiceLangCode = 'fr-FR' | 'en-US' | 'ar-SA' | 'ar-TN' | 'ar-EG';
export type VideoDetectedLang = 'fr' | 'en' | 'ar' | 'ar-dialect';

export function voiceLangToDetectedLang(code: VoiceLangCode): VideoDetectedLang {
  if (code === 'en-US') return 'en';
  if (code === 'ar-SA') return 'ar';
  if (code === 'ar-TN' || code === 'ar-EG') return 'ar-dialect';
  return 'fr';
}

export const VIDEO_PRESENTATION_TIPS: Record<VideoDetectedLang, string> = {
  fr: 'Dites : votre prénom, nom, métier, ville et vos compétences principales',
  en: 'Say: your first name, last name, job title, city and main skills',
  ar: 'قل: اسمك، مهنتك، مدينتك ومهاراتك الأساسية',
  'ar-dialect': 'قول: اسمك، خدمتك، ولايتك ومهاراتك الأساسية',
};
