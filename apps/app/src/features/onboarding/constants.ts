// Option lists ported from the old app's inscriptionData.ts / inline TR objects
// (French only, matching this app's single-language convention — see auth-layout.tsx).

export const SERVICE_TYPES = [
  'Chauffeur / Transport',
  'Service à domicile',
  'Aide ménagère',
  'Services & missions / Consulting',
  'Restauration / Service',
  'Jardinage / Bricolage',
  "Garde d'enfants",
  'Informatique / Tech',
  'Autre',
];

export const INTERESTS_SUGGESTIONS = [
  'Bricolage',
  'Jardinage',
  'Enfants',
  'Ménage',
  'Cuisine',
  'Informatique',
  'Traduction',
  'Graphisme',
  'Marketing',
  'Comptabilité',
  'Transport',
  'Déménagement',
  'Plomberie',
  'Électricité',
  'Peinture',
];

export const GOAL_CATEGORIES = [
  {
    emoji: '💼',
    label: 'Trouver du travail',
    options: [
      "Recruter quelqu'un",
      'Trouver un job',
      'Proposer mes services',
      'Travailler comme prestataire',
      'Demander un service',
    ],
  },
  {
    emoji: '🧑‍💻',
    label: 'Services & missions',
    options: [
      'Trouver un prestataire',
      'Rencontrer des personnes près de moi',
      'Trouver des missions',
      'Découvrir des idées et opportunités',
      'Service à domicile',
    ],
  },
];

export const DAYS = [
  { short: 'Lun', long: 'Lundi' },
  { short: 'Mar', long: 'Mardi' },
  { short: 'Mer', long: 'Mercredi' },
  { short: 'Jeu', long: 'Jeudi' },
  { short: 'Ven', long: 'Vendredi' },
  { short: 'Sam', long: 'Samedi' },
  { short: 'Dim', long: 'Dimanche' },
];

export const DAY_TRANSLATIONS: Record<
  string,
  Record<'en' | 'fr' | 'ar', { short: string; long: string }>
> = {
  Lun: {
    en: { short: 'Mon', long: 'Monday' },
    fr: { short: 'Lun', long: 'Lundi' },
    ar: { short: 'إثن', long: 'الإثنين' },
  },
  Mar: {
    en: { short: 'Tue', long: 'Tuesday' },
    fr: { short: 'Mar', long: 'Mardi' },
    ar: { short: 'ثلا', long: 'الثلاثاء' },
  },
  Mer: {
    en: { short: 'Wed', long: 'Wednesday' },
    fr: { short: 'Mer', long: 'Mercredi' },
    ar: { short: 'أرب', long: 'الأربعاء' },
  },
  Jeu: {
    en: { short: 'Thu', long: 'Thursday' },
    fr: { short: 'Jeu', long: 'Jeudi' },
    ar: { short: 'خمي', long: 'الخميس' },
  },
  Ven: {
    en: { short: 'Fri', long: 'Friday' },
    fr: { short: 'Ven', long: 'Vendredi' },
    ar: { short: 'جمع', long: 'الجمعة' },
  },
  Sam: {
    en: { short: 'Sat', long: 'Saturday' },
    fr: { short: 'Sam', long: 'Samedi' },
    ar: { short: 'سبت', long: 'السبت' },
  },
  Dim: {
    en: { short: 'Sun', long: 'Sunday' },
    fr: { short: 'Dim', long: 'Dimanche' },
    ar: { short: 'أحد', long: 'الأحد' },
  },
};

export function getDayLabel(
  dayShort: string,
  locale: string = 'fr',
): { short: string; long: string } {
  const loc = (locale === 'en' || locale === 'ar' ? locale : 'fr') as 'en' | 'fr' | 'ar';
  return DAY_TRANSLATIONS[dayShort]?.[loc] ?? { short: dayShort, long: dayShort };
}

export const TIME_SLOTS = [
  { value: 'morning', label: 'Matin', hint: '6h – 12h' },
  { value: 'afternoon', label: 'Après-midi', hint: '12h – 18h' },
  { value: 'evening', label: 'Soir', hint: '18h – 22h' },
  { value: 'flexible', label: 'Flexible', hint: 'Selon dispo' },
];

export const TIME_SLOT_TRANSLATIONS: Record<
  string,
  Record<'en' | 'fr' | 'ar', { label: string; hint: string }>
> = {
  morning: {
    en: { label: 'Morning', hint: '6am – 12pm' },
    fr: { label: 'Matin', hint: '6h – 12h' },
    ar: { label: 'صباحًا', hint: '6ص – 12م' },
  },
  afternoon: {
    en: { label: 'Afternoon', hint: '12pm – 6pm' },
    fr: { label: 'Après-midi', hint: '12h – 18h' },
    ar: { label: 'بعد الظهر', hint: '12م – 6م' },
  },
  evening: {
    en: { label: 'Evening', hint: '6pm – 10pm' },
    fr: { label: 'Soir', hint: '18h – 22h' },
    ar: { label: 'مساءً', hint: '6م – 10م' },
  },
  flexible: {
    en: { label: 'Flexible', hint: 'As available' },
    fr: { label: 'Flexible', hint: 'Selon dispo' },
    ar: { label: 'مرن', hint: 'حسب التوفر' },
  },
};

export function getTimeSlotLabel(
  slotValue: string,
  locale: string = 'fr',
): { label: string; hint: string } {
  const loc = (locale === 'en' || locale === 'ar' ? locale : 'fr') as 'en' | 'fr' | 'ar';
  return TIME_SLOT_TRANSLATIONS[slotValue]?.[loc] ?? { label: slotValue, hint: '' };
}

export const CONTACT_OPTIONS = [
  { value: 'phone', label: 'Appel téléphonique' },
  { value: 'whatsapp', label: 'WhatsApp / Chat' },
  { value: 'person', label: 'Rendez-vous présentiel' },
];

export const CONTACT_OPTION_TRANSLATIONS: Record<string, Record<'en' | 'fr' | 'ar', string>> = {
  phone: {
    en: 'Phone call',
    fr: 'Appel téléphonique',
    ar: 'مكالمة هاتفية',
  },
  whatsapp: {
    en: 'WhatsApp or messaging',
    fr: 'WhatsApp ou messagerie',
    ar: 'WhatsApp أو المراسلة',
  },
  person: {
    en: 'In-person meeting',
    fr: 'Rendez-vous en personne',
    ar: 'لقاء مباشر',
  },
};

export function getContactOptionLabel(value: string, locale: string = 'fr'): string {
  const loc = (locale === 'en' || locale === 'ar' ? locale : 'fr') as 'en' | 'fr' | 'ar';
  return CONTACT_OPTION_TRANSLATIONS[value]?.[loc] ?? value;
}

export const LANGUAGE_OPTIONS = [
  { value: 'ar', label: 'Arabe', flag: '🇹🇳' },
  { value: 'ar-dialect', label: 'Arabe dialectal', flag: '🗣️' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'Anglais', flag: '🇬🇧' },
  { value: 'de', label: 'Allemand', flag: '🇩🇪' },
  { value: 'es', label: 'Espagnol', flag: '🇪🇸' },
  { value: 'it', label: 'Italien', flag: '🇮🇹' },
];

export const LANGUAGE_OPTION_TRANSLATIONS: Record<string, Record<'en' | 'fr' | 'ar', string>> = {
  ar: {
    en: 'Arabic',
    fr: 'Arabe',
    ar: 'العربية',
  },
  'ar-dialect': {
    en: 'Tunisian Arabic',
    fr: 'Arabe tunisien',
    ar: 'العربية التونسية',
  },
  fr: {
    en: 'French',
    fr: 'Français',
    ar: 'الفرنسية',
  },
  en: {
    en: 'English',
    fr: 'Anglais',
    ar: 'الإنجليزية',
  },
  de: {
    en: 'German',
    fr: 'Allemand',
    ar: 'الألمانية',
  },
  es: {
    en: 'Spanish',
    fr: 'Espagnol',
    ar: 'الإسبانية',
  },
  it: {
    en: 'Italian',
    fr: 'Italien',
    ar: 'الإيطالية',
  },
};

export function getLanguageOptionLabel(value: string, locale: string = 'fr'): string {
  const loc = (locale === 'en' || locale === 'ar' ? locale : 'fr') as 'en' | 'fr' | 'ar';
  return LANGUAGE_OPTION_TRANSLATIONS[value]?.[loc] ?? value;
}

export const MAX_INTERESTS = 5;

export const EXPERIENCE_OPTIONS = [
  "Moins d'1 an",
  '1-2 ans',
  '3-5 ans',
  '5-10 ans',
  'Plus de 10 ans',
];

export const SECTOR_OPTIONS = [
  'Informatique / Tech',
  'Marketing / Communication',
  'Finance / Comptabilité',
  'BTP / Artisanat',
  'Santé / Médical',
  'Education / Formation',
  'Transport / Logistique',
  'Restauration / Hôtellerie',
  'Commerce / Vente',
  "Garde d'enfants",
  'Ménage',
  'Plomberie / Sanitaire',
  'Bâtiment et travaux',
  'Autre',
];

export const EDUCATION_OPTIONS = [
  'Bac',
  'Bac+2 / BTS / DUT',
  'Licence (Bac+3)',
  'Master (Bac+5)',
  'Mastère de recherche',
  'Doctorat',
  'Formation professionnelle',
  'Autre',
];
