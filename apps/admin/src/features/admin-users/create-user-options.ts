/**
 * Fixed field options for the admin "Add user" form — copied from the member app's
 * onboarding constants (apps/app/src/features/onboarding/constants.ts) so the admin-created
 * profile uses the exact same vocabulary as a real signup, since the API schema enforces the
 * same enums server-side.
 */

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

export const MAX_INTERESTS = 5;

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

export const AVAILABILITY_DAYS: { short: string; long: string }[] = [
  { short: 'Lun', long: 'Lundi' },
  { short: 'Mar', long: 'Mardi' },
  { short: 'Mer', long: 'Mercredi' },
  { short: 'Jeu', long: 'Jeudi' },
  { short: 'Ven', long: 'Vendredi' },
  { short: 'Sam', long: 'Samedi' },
  { short: 'Dim', long: 'Dimanche' },
];

export const AVAILABILITY_HOURS: { value: string; label: string }[] = [
  { value: 'morning', label: 'Matin (6h–12h)' },
  { value: 'afternoon', label: 'Après-midi (12h–18h)' },
  { value: 'evening', label: 'Soir (18h–22h)' },
  { value: 'flexible', label: 'Flexible' },
];

export const CONTACT_MODES: { value: string; label: string }[] = [
  { value: 'phone', label: 'Appel téléphonique' },
  { value: 'whatsapp', label: 'WhatsApp / Chat' },
  { value: 'person', label: 'Rendez-vous présentiel' },
];

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'ar', label: 'Arabe' },
  { value: 'ar-dialect', label: 'Arabe dialectal' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'de', label: 'Allemand' },
  { value: 'es', label: 'Espagnol' },
  { value: 'it', label: 'Italien' },
];

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

export const PROFILE_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const PROFILE_PHOTO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function isAllowedProfilePhoto(file: File): boolean {
  if (PROFILE_PHOTO_MIMES.has(file.type)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}
