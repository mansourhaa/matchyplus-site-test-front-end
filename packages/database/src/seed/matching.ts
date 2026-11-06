import bcrypt from 'bcryptjs';

import {
  PrismaClient,
  ProfileType,
  Role,
  SwipeDirection,
  UserPlan,
  UserStatus,
} from '@saas-boilerplate/types';

/** Tunis metro + Cap Bon — covers common browser GPS along the coast. */
const TUNIS = { lat: 36.8065, lon: 10.1815 };
const HAMMAMET = { lat: 36.4, lon: 10.62 };
/** Kairouan / El Alam coordinates for testing within the strict 25km radius. */
const KAIROUAN = { lat: 35.8, lon: 10.08 };
const EL_ALAM = { lat: 35.9099, lon: 10.06 };

type MatchingProfileSeed = {
  email: string;
  name: string;
  job?: string | null;
  category?: string | null;
  city: string;
  bio?: string | null;
  video?: string | null;
  interests: string[];
  goals: string[];
  looking_for?: string | null;
  activity_sector?: string | null;
  service_type?: string | null;
  profile_type: ProfileType;
  image?: string | null;
  auth_provider?: string;
  plan?: UserPlan;
  lat?: number | null;
  lon?: number | null;
  offer_service?: boolean;
  price?: string | null;
  availability_days?: string[];
  languages?: string[];
  contact_modes?: string[];
  experiences?: any;
  educations?: any;
  rating?: number;
  reviews?: number;
  verified?: boolean;
  onboarding_completed_at?: Date | null;
  /** When true, this profile already RIGHT-swiped the tester (liked_me boost). */
  likesTester?: boolean;
  /** When true, user has only completed onboarding wizard and does not have a complete profile. */
  onboardingOnly?: boolean;
  /** Scenario documentation for testing and verification. */
  scenarioNotes?: string;
};

/**
 * Dedicated matching demo user. Log in as this account to exercise discovery / swipe / matches.
 * Password: passer
 */
export const MATCHING_TESTER = {
  email: 'matcher@matchyplus.tn',
  password: 'passer',
  name: 'Amine Matcher',
  job: 'Product Manager',
  category: 'Tech',
  city: 'Kairouan',
  bio: 'Je recrute des freelances tech et cherche des prestataires près de Kairouan pour prototyper Matchy+.',
  interests: ['Product', 'Startup', 'Design', 'Networking'],
  goals: ["recruter quelqu'un", 'trouver un prestataire', 'rencontrer des personnes près de moi'],
  looking_for: 'recruter hire freelances et trouver un prestataire près de moi',
  activity_sector: 'Tech',
  service_type: 'Product Management',
  profile_type: ProfileType.PROVIDER,
  lat: EL_ALAM.lat,
  lon: EL_ALAM.lon,
  price: '60 DT',
  availability_days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
  languages: ['fr', 'ar', 'en'],
};

const PROFILES: MatchingProfileSeed[] = [
  {
    email: 'sara.dev@matchy.seed',
    name: 'Sara Ben Ali',
    job: 'Développeuse Full-Stack',
    category: 'Tech',
    city: 'Kairouan',
    bio: 'Full-stack React / Node. Ouverte aux missions produit et startups.',
    interests: ['React', 'Node', 'Startup', 'Product'],
    goals: ['trouver un job', 'proposer mes services', 'collaborer sur un projet'],
    looking_for: 'job emploi mission CDI freelance',
    activity_sector: 'Tech',
    service_type: 'Développement web',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    plan: UserPlan.FREE,
    lat: 35.912,
    lon: 10.065,
    contact_modes: ['call', 'café', 'video'],
    likesTester: true,
  },
  {
    email: 'youssef.ux@matchy.seed',
    name: 'Youssef Khelifi',
    job: 'UX Designer',
    category: 'Design',
    city: 'Kairouan',
    bio: 'Designer produit, design systems et prototypes Figma.',
    interests: ['Design', 'Figma', 'Product', 'Startup'],
    goals: ['proposer mes services', 'trouver un partenaire'],
    looking_for: 'proposer mes services prestataire missions UX',
    activity_sector: 'Tech',
    service_type: 'UX Design',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.925,
    lon: 10.075,
    contact_modes: ['video', 'café'],
    likesTester: true,
  },
  {
    email: 'nadia.market@matchy.seed',
    name: 'Nadia Trabelsi',
    job: 'Growth Marketer',
    category: 'Marketing',
    city: 'Kairouan',
    bio: 'Acquisition, SEO et campagnes pour SaaS B2B.',
    interests: ['Marketing', 'SEO', 'Startup', 'Networking'],
    goals: ['proposer mes services', 'rencontrer des personnes près de moi'],
    looking_for: 'proposer mes services growth marketing',
    activity_sector: 'Marketing',
    service_type: 'Growth Marketing',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    plan: UserPlan.FREE,
    lat: 35.88,
    lon: 10.04,
    contact_modes: ['call', 'whatsapp'],
  },
  {
    email: 'karim.devops@matchy.seed',
    name: 'Karim Jebali',
    job: 'DevOps Engineer',
    category: 'Tech',
    city: 'El Alam',
    bio: 'CI/CD, Kubernetes et infra cloud. Dispo missions courtes.',
    interests: ['DevOps', 'Kubernetes', 'AWS', 'Startup'],
    goals: ['trouver un job', 'proposer mes services'],
    looking_for: 'job emploi mission devops',
    activity_sector: 'Tech',
    service_type: 'DevOps',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.908,
    lon: 10.058,
    contact_modes: ['call', 'video', 'café'],
    likesTester: true,
  },
  {
    email: 'leila.legal@matchy.seed',
    name: 'Leila Mansour',
    job: 'Avocate contrats tech',
    category: 'Juridique',
    city: 'Kairouan',
    bio: 'Contrats freelances, CGU et levées de fonds early-stage.',
    interests: ['Legal', 'Startup', 'Contrats'],
    goals: ['proposer mes services', 'trouver un partenaire'],
    looking_for: 'proposer mes services juridique',
    activity_sector: 'Juridique',
    service_type: 'Conseil juridique',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.85,
    lon: 10.07,
    contact_modes: ['call', 'café'],
  },
  {
    email: 'omar.data@matchy.seed',
    name: 'Omar Gharbi',
    job: 'Data Analyst',
    category: 'Tech',
    city: 'Kairouan',
    bio: null,
    interests: ['Data', 'SQL', 'Product', 'Startup'],
    goals: ['trouver un job', 'collaborer sur un projet'],
    looking_for: null,
    activity_sector: 'Tech',
    service_type: 'Data Analysis',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.93,
    lon: 10.085,
    contact_modes: ['call', 'café'],
    onboardingOnly: true,
  },
  {
    email: 'hana.photo@matchy.seed',
    name: 'Hana Belhaj',
    job: 'Photographe pro',
    category: 'Créatif',
    city: 'Kairouan',
    bio: null,
    interests: ['Photo', 'Branding', 'Startup'],
    goals: ['proposer mes services', 'demander un service'],
    looking_for: null,
    activity_sector: 'Créatif',
    service_type: 'Photographie',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.87,
    lon: 10.03,
    contact_modes: ['call', 'café'],
    onboardingOnly: true,
  },
  {
    email: 'mehdi.founder@matchy.seed',
    name: 'Mehdi Saidi',
    job: 'Founder SaaS',
    category: 'Tech',
    city: 'Kairouan',
    bio: 'Je recrute des profils tech et cherche des partenaires business.',
    interests: ['Startup', 'Product', 'Networking', 'Invest'],
    goals: ["recruter quelqu'un", 'trouver un partenaire', 'lever des fonds'],
    looking_for: 'recruter hire et seek investment partenaires',
    activity_sector: 'Tech',
    service_type: 'Entrepreneuriat',
    profile_type: ProfileType.PROVIDER,
    image:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    plan: UserPlan.FREE,
    lat: 35.82,
    lon: 10.03,
    contact_modes: ['call', 'café', 'video'],
  },
  {
    email: 'amira.hr@matchy.seed',
    name: 'Amira Chebbi',
    job: 'HR Business Partner',
    category: 'RH',
    city: 'Kairouan',
    bio: 'Recrutement tech et freelances pour scale-ups tunisiennes.',
    interests: ['RH', 'Recrutement', 'Tech', 'Networking'],
    goals: ["recruter quelqu'un", 'rencontrer des personnes près de moi'],
    looking_for: 'recruter hire candidats tech',
    activity_sector: 'RH',
    service_type: 'Recrutement',
    profile_type: ProfileType.PROVIDER,
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.89,
    lon: 10.09,
    contact_modes: ['call', 'video'],
  },
  {
    email: 'soft.mutual@matchy.seed',
    name: 'Sami Mutual',
    job: 'Mobile Developer',
    category: 'Tech',
    city: 'Kairouan',
    bio: 'Flutter / React Native. Déjà matché avec le compte de test pour la page Matches.',
    interests: ['Mobile', 'Flutter', 'Product', 'Startup'],
    goals: ['trouver un job', 'proposer mes services'],
    looking_for: 'job emploi mission mobile',
    activity_sector: 'Tech',
    service_type: 'Développement mobile',
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.91,
    lon: 10.062,
    contact_modes: ['call', 'café', 'video'],
  },
  // -------------------------------------------------------------------------------------
  // REGISTRATION SKIP SCENARIOS (Testing realistic step omissions)
  // -------------------------------------------------------------------------------------
  {
    // Scenario 1: Delivery Courier who skipped Education, Bio, and Video
    email: 'sami.driver@matchy.seed',
    name: 'Sami Ben Amor',
    job: 'Chauffeur livreur',
    category: 'Transport / Logistique',
    city: 'Kairouan',
    bio: null, // Skipped bio
    video: null, // Skipped video
    interests: ['livraison', 'chauffeur livreur', 'coursier'],
    goals: ['proposer mes services', 'travailler comme prestataire'],
    looking_for: null,
    activity_sector: 'Transport, Logistique & Mobilité',
    service_type: 'Chauffeur / Transport',
    profile_type: ProfileType.PROVIDER,
    image:
      'https://images.unsplash.com/photo-1526367790999-0150786686a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.85,
    lon: 10.09,
    price: '12 DT',
    availability_days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    languages: ['fr', 'ar'],
    contact_modes: ['call', 'whatsapp'],
    experiences: [
      {
        id: 'exp-1',
        title: 'Chauffeur livreur',
        company: 'Express Delivery',
        startDate: '2023-01',
        endDate: '2025-12',
        current: true,
      },
    ],
    educations: [], // Skipped via "Passer"
    rating: 4.9,
    reviews: 38,
    scenarioNotes: 'Courier who skipped Education, Bio, and Video',
  },
  {
    // Scenario 2: Provider / Employer who skipped individual Job title (Allowed for PROVIDER)
    email: 'moncef.clean@matchy.seed',
    name: 'Moncef Nettoyage Pro',
    job: null, // Skipped job title (optional for PROVIDER)
    category: 'Services Locaux & Artisanat',
    city: 'Kairouan',
    bio: 'Entreprise de nettoyage et aide à domicile pour particuliers et bureaux.',
    video: null,
    interests: ['nettoyage', 'aide ménagère', 'maison'],
    goals: ['proposer mes services'],
    looking_for: 'proposer prestations nettoyage et entretien',
    activity_sector: 'Services Locaux & Artisanat',
    service_type: 'Service à domicile',
    profile_type: ProfileType.PROVIDER,
    image:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.87,
    lon: 10.07,
    price: '20 DT',
    availability_days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
    languages: ['fr', 'ar'],
    contact_modes: ['call', 'café'],
    experiences: [], // Skipped
    educations: [], // Skipped
    rating: 4.8,
    reviews: 19,
    scenarioNotes: 'Service provider agency who skipped individual job title',
  },
  {
    // Scenario 3: Pure Client who skipped offer_service, experiences, and educations
    email: 'mariem.client@matchy.seed',
    name: 'Mariem Jaziri',
    job: "Architecte d'intérieur",
    category: 'Services Professionnels',
    city: 'Kairouan',
    bio: 'Je cherche des prestataires de confiance pour livraisons et ménage régulier.',
    video: null,
    interests: ['livraison', 'aide ménagère', 'bricolage'],
    goals: ['demander un service', 'trouver un prestataire'],
    looking_for: 'trouver un prestataire livraison et ménage',
    activity_sector: 'Services Professionnels',
    offer_service: false, // Not offering a service
    service_type: null, // Skipped because offer_service = false
    price: null, // Skipped because offer_service = false
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.82,
    lon: 10.09,
    languages: ['fr', 'ar', 'en'],
    contact_modes: ['call', 'video'],
    experiences: [], // Skipped via "Passer"
    educations: [], // Skipped via "Passer"
    rating: 5.0,
    reviews: 7,
    scenarioNotes: 'Pure client hiring providers, skipped supply fields & cv steps',
  },
  {
    // Scenario 4: Google OAuth User who skipped Photo Upload (image: null)
    email: 'tarek.oauth@matchy.seed',
    name: 'Tarek Bouazizi',
    auth_provider: 'google', // OAuth account
    job: 'Développeur Mobile',
    category: 'Technologie & Digital',
    city: 'El Alam',
    bio: 'Développeur mobile Flutter & iOS. Ouvert aux projets innovants.',
    video: null,
    interests: ['Flutter', 'Mobile', 'Startup'],
    goals: ['trouver un job', 'collaborer sur un projet'],
    looking_for: 'missions freelance Flutter',
    activity_sector: 'Technologie & Digital',
    service_type: 'Développement mobile',
    profile_type: ProfileType.INDIVIDUAL,
    image: null, // Skipped photo upload (allowed for OAuth)
    lat: 35.89,
    lon: 10.06,
    price: '50 DT',
    languages: ['fr', 'en'],
    contact_modes: ['video', 'café'],
    experiences: [
      {
        id: 'exp-flutter',
        title: 'Flutter Developer',
        company: 'AppStudio',
        startDate: '2022-03',
        endDate: '2025-01',
        current: false,
      },
    ],
    educations: [
      {
        id: 'edu-isg',
        school: 'ISG Tunis',
        degree: 'Licence Informatique',
        field: 'Software',
        startDate: '2019',
        endDate: '2022',
        result: 'Bien',
      },
    ],
    rating: 4.6,
    reviews: 8,
    scenarioNotes: 'OAuth account skipping photo upload, testing initials avatar fallback',
  },
  {
    // Scenario 5: Craftsman Plumber who skipped Education & fixed Availability Days
    email: 'walid.craft@matchy.seed',
    name: 'Walid Plombier',
    job: 'Plombier chauffagiste',
    category: 'Services Locaux & Artisanat',
    city: 'Kairouan',
    bio: 'Dépannage plomberie et sanitaire d’urgence 24/7.',
    video: null,
    interests: ['plomberie', 'dépannage', 'bricolage'],
    goals: ['proposer mes services'],
    looking_for: 'urgences et réparations plomberie',
    activity_sector: 'Services Locaux & Artisanat',
    service_type: 'Jardinage / Bricolage',
    profile_type: ProfileType.PROVIDER,
    image:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.91,
    lon: 10.08,
    price: '30 DT',
    availability_days: [], // Skipped fixed calendar (flexible/on-call)
    languages: ['ar', 'fr'],
    contact_modes: ['call', 'whatsapp'],
    experiences: [
      {
        id: 'exp-craft',
        title: 'Artisan indépendant',
        company: 'Auto-entrepreneur',
        startDate: '2018',
        endDate: '2026',
        current: true,
      },
    ],
    educations: [], // Skipped
    rating: 4.9,
    reviews: 64,
    scenarioNotes: 'On-call craftsman skipping education & fixed availability schedule',
  },
  {
    // Scenario 6: User who Denied / Skipped GPS Permission (City-only)
    email: 'leila.nogps@matchy.seed',
    name: 'Leila Ben Salem',
    job: 'Comptable',
    category: 'Finance & Assurance',
    city: 'Sousse',
    bio: 'Comptable indépendante. Cherche services de livraison.',
    video: null,
    interests: ['livraison', 'courses', 'transport'],
    goals: ['demander un service'],
    looking_for: 'livraisons rapides de documents',
    activity_sector: 'Finance & Assurance',
    offer_service: false,
    service_type: null,
    price: null,
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: null, // Denied/Skipped GPS
    lon: null, // Denied/Skipped GPS
    languages: ['fr', 'ar'],
    contact_modes: ['call'],
    experiences: [],
    educations: [],
    rating: 4.7,
    reviews: 12,
    scenarioNotes: 'User who denied GPS location permission; tests city-fallback',
  },
  {
    // Scenario 7: Incomplete Onboarding (Abandoned during wizard)
    email: 'anis.abandoned@matchy.seed',
    name: 'Anis Incomplet',
    job: null,
    category: null,
    city: 'Kairouan',
    bio: null,
    video: null,
    interests: [], // No interests
    goals: [], // No goals
    activity_sector: null,
    service_type: null,
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.8,
    lon: 10.0,
    onboarding_completed_at: null, // Not completed!
    scenarioNotes: 'User who abandoned registration; tests feed exclusion of incomplete profiles',
  },
  {
    // Scenario 8: Power User (100% complete profile, No Skips, Gold Standard)
    email: 'ines.allsteps@matchy.seed',
    name: 'Ines Mansouri',
    job: 'Consultante Marketing Digital',
    category: 'Services Professionnels',
    city: 'Kairouan',
    bio: '10 ans d’expérience en stratégie marketing digital, branding et growth.',
    video: '/uploads/videos/ines-intro.mp4', // Has presentation video
    interests: ['Marketing', 'E-commerce', 'Stratégie', 'Growth'],
    goals: ['proposer mes services', "recruter quelqu'un", 'collaborer sur un projet'],
    looking_for: 'missions de consulting et partenariats digitaux',
    activity_sector: 'Services Professionnels',
    service_type: 'Services & missions / Consulting',
    profile_type: ProfileType.PROVIDER,
    image:
      'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.9,
    lon: 10.06,
    price: '80 DT',
    availability_days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
    languages: ['fr', 'ar', 'en'],
    contact_modes: ['call', 'video', 'café', 'whatsapp'],
    experiences: [
      {
        id: 'exp-senior-mkt',
        title: 'Senior Marketing Consultant',
        company: 'Growth Agency',
        startDate: '2020-01',
        endDate: '2026-01',
        current: true,
      },
      {
        id: 'exp-head-growth',
        title: 'Head of Growth',
        company: 'SaaS Startup',
        startDate: '2016-03',
        endDate: '2019-12',
        current: false,
      },
    ],
    educations: [
      {
        id: 'edu-ihec',
        school: 'IHEC Carthage',
        degree: 'Master Marketing & Communication',
        field: 'Marketing',
        startDate: '2011',
        endDate: '2016',
        result: 'Mention Très Bien',
      },
    ],
    rating: 5.0,
    reviews: 52,
    verified: true, // Verified badge
    scenarioNotes: 'Power user with 100% complete profile (video, degrees, verified)',
  },
  {
    // Scenario 9: Multilingual Darija / Arabizi Courier using Taxonomy Tags
    email: 'karim.tunis@matchy.seed',
    name: 'Karim Livreur Rapide',
    job: 'شوفور ليفريزون', // Tunisian Darija
    category: 'Transport, Logistique & Mobilité',
    city: 'Kairouan',
    bio: 'نخدم توصيل كولي وطرود في كامل المنطقة. خدمة سريعة ونظيفة.',
    video: null,
    interests: ['توصيل', 'chauffeur livraison', 'coursier'],
    goals: ['proposer mes services'],
    looking_for: 'توصيل طلبات',
    activity_sector: 'Transport, Logistique & Mobilité',
    service_type: 'Chauffeur / Transport',
    profile_type: ProfileType.PROVIDER,
    image:
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.88,
    lon: 10.05,
    price: '8 DT',
    availability_days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    languages: ['ar', 'fr'],
    contact_modes: ['call', 'whatsapp'],
    experiences: [
      {
        id: 'exp-courier',
        title: 'Coursier indépendant',
        company: 'Livraison Rapide',
        startDate: '2021',
        endDate: '2026',
        current: true,
      },
    ],
    educations: [], // Skipped
    rating: 4.8,
    reviews: 26,
    scenarioNotes: 'Multilingual Darija courier testing cross-lingual taxonomy matching',
  },
  {
    // Scenario 10: Service Worker seeking employment (offer_service=false, skipped education)
    email: 'nour.waitress@matchy.seed',
    name: 'Nour Khemiri',
    job: 'Serveuse / Barista',
    category: 'Services Locaux & Artisanat',
    city: 'Kairouan',
    bio: 'Expérience en restauration et service en salle. Dynamique et souriante.',
    video: null,
    interests: ['restauration', 'service', 'café'],
    goals: ['trouver un job'],
    looking_for: 'cherche emploi serveuse ou barista',
    activity_sector: 'Services Locaux & Artisanat',
    offer_service: false, // Seeking employment, not gig freelancing
    service_type: null,
    price: null,
    profile_type: ProfileType.INDIVIDUAL,
    image:
      'https://images.unsplash.com/photo-1548142813-c348350df52b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 35.89,
    lon: 10.07,
    availability_days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    languages: ['fr', 'ar'],
    contact_modes: ['call', 'café'],
    experiences: [
      {
        id: 'exp-resto',
        title: 'Serveuse en salle',
        company: 'Café Restaurant Médina',
        startDate: '2022-05',
        endDate: '2024-11',
        current: false,
      },
    ],
    educations: [], // Skipped
    rating: 4.7,
    reviews: 14,
    scenarioNotes: 'Job seeker in food & hospitality skipping education and gig offer fields',
  },
];

async function upsertUserWithLocation(
  prisma: PrismaClient,
  data: MatchingProfileSeed & { passwordHash: string; role?: Role; status?: UserStatus },
) {
  const isOnboardingOnly = Boolean(data.onboardingOnly);
  const user = await prisma.user.upsert({
    where: { email: data.email },
    create: {
      email: data.email,
      password: data.passwordHash,
      name: data.name,
      role: data.role ?? Role.USER,
      status: data.status ?? UserStatus.ACTIVE,
      plan: data.plan ?? UserPlan.FREE,
      auth_provider: data.auth_provider ?? 'phone',
      job: data.job ?? null,
      category: data.category ?? null,
      city: data.city,
      bio: isOnboardingOnly ? null : (data.bio ?? null),
      video: data.video ?? null,
      image: data.image ?? null,
      interests: data.interests ?? [],
      goals: data.goals ?? [],
      selected_goals: data.goals ?? [],
      offer_service:
        data.offer_service !== undefined ? data.offer_service : Boolean(data.service_type),
      looking_for: isOnboardingOnly ? null : (data.looking_for ?? null),
      activity_sector: data.activity_sector ?? null,
      service_type: data.service_type ?? null,
      profile_type: data.profile_type,
      gps_latitude: data.lat ?? null,
      gps_longitude: data.lon ?? null,
      price: data.price ?? null,
      availability_days: data.availability_days ?? [],
      rating: isOnboardingOnly ? 0 : (data.rating ?? 4.5),
      reviews: isOnboardingOnly ? 0 : (data.reviews ?? 0),
      matches: 0,
      languages: data.languages ?? ['fr', 'ar'],
      contact_modes: data.contact_modes ?? ['call', 'café'],
      experiences: data.experiences ?? undefined,
      educations: data.educations ?? undefined,
      verified: Boolean(data.verified),
      onboarding_completed_at:
        data.onboarding_completed_at !== undefined
          ? data.onboarding_completed_at
          : new Date(),
    },
    update: {
      name: data.name,
      status: data.status ?? UserStatus.ACTIVE,
      plan: data.plan ?? UserPlan.FREE,
      auth_provider: data.auth_provider ?? 'phone',
      job: data.job ?? null,
      category: data.category ?? null,
      city: data.city,
      bio: isOnboardingOnly ? null : (data.bio ?? null),
      video: data.video ?? null,
      image: data.image ?? null,
      interests: data.interests ?? [],
      goals: data.goals ?? [],
      selected_goals: data.goals ?? [],
      offer_service:
        data.offer_service !== undefined ? data.offer_service : Boolean(data.service_type),
      looking_for: isOnboardingOnly ? null : (data.looking_for ?? null),
      activity_sector: data.activity_sector ?? null,
      service_type: data.service_type ?? null,
      profile_type: data.profile_type,
      gps_latitude: data.lat ?? null,
      gps_longitude: data.lon ?? null,
      price: data.price ?? null,
      availability_days: data.availability_days ?? [],
      rating: isOnboardingOnly ? 0 : (data.rating ?? 4.5),
      reviews: isOnboardingOnly ? 0 : (data.reviews ?? 0),
      languages: data.languages ?? ['fr', 'ar'],
      contact_modes: data.contact_modes ?? ['call', 'café'],
      experiences: data.experiences ?? undefined,
      educations: data.educations ?? undefined,
      verified: Boolean(data.verified),
      onboarding_completed_at:
        data.onboarding_completed_at !== undefined
          ? data.onboarding_completed_at
          : new Date(),
      role: data.role ?? Role.USER,
    },
  });

  if (data.lat != null && data.lon != null) {
    await prisma.userLocation.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        latitude: data.lat,
        longitude: data.lon,
        location_enabled: true,
        city: data.city,
        country: 'Tunisia',
      },
      update: {
        latitude: data.lat,
        longitude: data.lon,
        location_enabled: true,
        city: data.city,
        country: 'Tunisia',
      },
    });
  }

  return user;
}

function pairIds(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

/**
 * Seeds discovery/swipe demo data for local matching tests.
 * Safe to re-run (upserts by email).
 */
export async function seedMatching(prisma: PrismaClient) {
  const passwordHash = bcrypt.hashSync(MATCHING_TESTER.password);

  const tester = await upsertUserWithLocation(prisma, {
    email: MATCHING_TESTER.email,
    passwordHash,
    name: MATCHING_TESTER.name,
    job: MATCHING_TESTER.job,
    category: MATCHING_TESTER.category,
    city: MATCHING_TESTER.city,
    bio: MATCHING_TESTER.bio,
    interests: MATCHING_TESTER.interests,
    goals: MATCHING_TESTER.goals,
    looking_for: MATCHING_TESTER.looking_for,
    activity_sector: MATCHING_TESTER.activity_sector,
    service_type: MATCHING_TESTER.service_type,
    profile_type: MATCHING_TESTER.profile_type,
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    plan: UserPlan.FREE,
    lat: MATCHING_TESTER.lat,
    lon: MATCHING_TESTER.lon,
  });

  const created: Array<{ id: string; email: string; likesTester?: boolean }> = [];

  for (const profile of PROFILES) {
    const user = await upsertUserWithLocation(prisma, {
      email: profile.email,
      passwordHash,
      name: profile.name,
      job: profile.job,
      category: profile.category,
      city: profile.city,
      bio: profile.bio,
      interests: profile.interests,
      goals: profile.goals,
      looking_for: profile.looking_for,
      activity_sector: profile.activity_sector,
      service_type: profile.service_type,
      profile_type: profile.profile_type,
      image: profile.image,
      plan: profile.plan,
      lat: profile.lat,
      lon: profile.lon,
      contact_modes: profile.contact_modes,
      onboardingOnly: profile.onboardingOnly,
    });
    created.push({ id: user.id, email: profile.email, likesTester: profile.likesTester });
  }

  // Incoming RIGHT swipes → reciprocity boost on the tester feed.
  for (const profile of created.filter((p) => p.likesTester)) {
    const existing = await prisma.swipe.findUnique({
      where: {
        swiper_id_target_id: { swiper_id: profile.id, target_id: tester.id },
      },
    });
    await prisma.swipe.upsert({
      where: {
        swiper_id_target_id: { swiper_id: profile.id, target_id: tester.id },
      },
      create: {
        swiper_id: profile.id,
        target_id: tester.id,
        direction: SwipeDirection.RIGHT,
      },
      update: { direction: SwipeDirection.RIGHT },
    });
    if (!existing) {
      await prisma.swipeLog.create({
        data: {
          user_id: profile.id,
          target_id: tester.id,
          direction: SwipeDirection.RIGHT,
        },
      });
    }
  }

  // Pre-seed one mutual match (Sami Mutual) so /matches is not empty.
  const mutual = created.find((p) => p.email === 'soft.mutual@matchy.seed');
  if (mutual) {
    await prisma.swipe.upsert({
      where: {
        swiper_id_target_id: { swiper_id: tester.id, target_id: mutual.id },
      },
      create: {
        swiper_id: tester.id,
        target_id: mutual.id,
        direction: SwipeDirection.RIGHT,
      },
      update: { direction: SwipeDirection.RIGHT },
    });
    await prisma.swipe.upsert({
      where: {
        swiper_id_target_id: { swiper_id: mutual.id, target_id: tester.id },
      },
      create: {
        swiper_id: mutual.id,
        target_id: tester.id,
        direction: SwipeDirection.RIGHT,
      },
      update: { direction: SwipeDirection.RIGHT },
    });

    const { low, high } = pairIds(tester.id, mutual.id);
    await prisma.match.upsert({
      where: {
        user_low_id_user_high_id: { user_low_id: low, user_high_id: high },
      },
      create: { user_low_id: low, user_high_id: high },
      update: {},
    });
  }

  return {
    testerEmail: MATCHING_TESTER.email,
    testerPassword: MATCHING_TESTER.password,
    profileCount: created.length,
  };
}
