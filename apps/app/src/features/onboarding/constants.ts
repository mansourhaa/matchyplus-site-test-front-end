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

export const TIME_SLOTS = [
  { value: 'morning', label: 'Matin', hint: '6h – 12h' },
  { value: 'afternoon', label: 'Après-midi', hint: '12h – 18h' },
  { value: 'evening', label: 'Soir', hint: '18h – 22h' },
  { value: 'flexible', label: 'Flexible', hint: 'Selon dispo' },
];

export const CONTACT_OPTIONS = [
  { value: 'phone', label: 'Appel téléphonique' },
  { value: 'whatsapp', label: 'WhatsApp / Chat' },
  { value: 'person', label: 'Rendez-vous présentiel' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'ar', label: 'Arabe', flag: '🇹🇳' },
  { value: 'ar-dialect', label: 'Arabe dialectal', flag: '🗣️' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'Anglais', flag: '🇬🇧' },
  { value: 'de', label: 'Allemand', flag: '🇩🇪' },
  { value: 'es', label: 'Espagnol', flag: '🇪🇸' },
  { value: 'it', label: 'Italien', flag: '🇮🇹' },
];

export const MAX_INTERESTS = 5;
