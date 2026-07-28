import bcrypt from 'bcryptjs';

import { PrismaClient, Role, SwipeDirection, UserPlan, UserStatus } from '@saas-boilerplate/types';

/** Tunis metro + Cap Bon — covers common browser GPS along the coast. */
const TUNIS = { lat: 36.8065, lon: 10.1815 };
const HAMMAMET = { lat: 36.4, lon: 10.62 };

type MatchingProfileSeed = {
  email: string;
  name: string;
  job: string;
  category: string;
  city: string;
  bio: string;
  interests: string[];
  goals: string[];
  looking_for: string;
  activity_sector: string;
  service_type: string;
  profile_type: string;
  image: string;
  plan?: UserPlan;
  lat: number;
  lon: number;
  /** When true, this profile already RIGHT-swiped the tester (liked_me boost). */
  likesTester?: boolean;
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
  city: 'Tunis',
  bio: 'Je recrute des freelances tech et cherche des prestataires près de Tunis pour prototyper Matchy+.',
  interests: ['Product', 'Startup', 'Design', 'Networking'],
  goals: ["recruter quelqu'un", 'trouver un prestataire', 'rencontrer des personnes près de moi'],
  looking_for: 'recruter hire freelances et trouver un prestataire près de moi',
  activity_sector: 'Tech',
  service_type: 'Product Management',
  profile_type: 'recruiter',
  lat: TUNIS.lat,
  lon: TUNIS.lon,
};

const PROFILES: MatchingProfileSeed[] = [
  {
    email: 'sara.dev@matchy.seed',
    name: 'Sara Ben Ali',
    job: 'Développeuse Full-Stack',
    category: 'Tech',
    city: 'Tunis',
    bio: 'Full-stack React / Node. Ouverte aux missions produit et startups.',
    interests: ['React', 'Node', 'Startup', 'Product'],
    goals: ['trouver un job', 'proposer mes services', 'collaborer sur un projet'],
    looking_for: 'job emploi mission CDI freelance',
    activity_sector: 'Tech',
    service_type: 'Développement web',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    plan: UserPlan.PREMIUM,
    lat: 36.81,
    lon: 10.18,
    likesTester: true,
  },
  {
    email: 'youssef.ux@matchy.seed',
    name: 'Youssef Khelifi',
    job: 'UX Designer',
    category: 'Design',
    city: 'Hammamet',
    bio: 'Designer produit, design systems et prototypes Figma.',
    interests: ['Design', 'Figma', 'Product', 'Startup'],
    goals: ['proposer mes services', 'trouver un partenaire'],
    looking_for: 'proposer mes services prestataire missions UX',
    activity_sector: 'Tech',
    service_type: 'UX Design',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: HAMMAMET.lat + 0.02,
    lon: HAMMAMET.lon - 0.03,
    likesTester: true,
  },
  {
    email: 'nadia.market@matchy.seed',
    name: 'Nadia Trabelsi',
    job: 'Growth Marketer',
    category: 'Marketing',
    city: 'Nabeul',
    bio: 'Acquisition, SEO et campagnes pour SaaS B2B.',
    interests: ['Marketing', 'SEO', 'Startup', 'Networking'],
    goals: ['proposer mes services', 'rencontrer des personnes près de moi'],
    looking_for: 'proposer mes services growth marketing',
    activity_sector: 'Marketing',
    service_type: 'Growth Marketing',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    plan: UserPlan.PREMIUM,
    lat: 36.45,
    lon: 10.74,
  },
  {
    email: 'karim.devops@matchy.seed',
    name: 'Karim Jebali',
    job: 'DevOps Engineer',
    category: 'Tech',
    city: 'Hammamet',
    bio: 'CI/CD, Kubernetes et infra cloud. Dispo missions courtes.',
    interests: ['DevOps', 'Kubernetes', 'AWS', 'Startup'],
    goals: ['trouver un job', 'proposer mes services'],
    looking_for: 'job emploi mission devops',
    activity_sector: 'Tech',
    service_type: 'DevOps',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: HAMMAMET.lat,
    lon: HAMMAMET.lon,
    likesTester: true,
  },
  {
    email: 'leila.legal@matchy.seed',
    name: 'Leila Mansour',
    job: 'Avocate contrats tech',
    category: 'Juridique',
    city: 'Hammamet',
    bio: 'Contrats freelances, CGU et levées de fonds early-stage.',
    interests: ['Legal', 'Startup', 'Contrats'],
    goals: ['proposer mes services', 'trouver un partenaire'],
    looking_for: 'proposer mes services juridique',
    activity_sector: 'Juridique',
    service_type: 'Conseil juridique',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 36.43,
    lon: 10.68,
  },
  {
    email: 'omar.data@matchy.seed',
    name: 'Omar Gharbi',
    job: 'Data Analyst',
    category: 'Tech',
    city: 'Tunis',
    bio: 'Dashboards, SQL et insights produit pour équipes growth.',
    interests: ['Data', 'SQL', 'Product', 'Startup'],
    goals: ['trouver un job', 'collaborer sur un projet'],
    looking_for: 'job emploi data analyst',
    activity_sector: 'Tech',
    service_type: 'Data Analysis',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 36.79,
    lon: 10.16,
  },
  {
    email: 'hana.photo@matchy.seed',
    name: 'Hana Belhaj',
    job: 'Photographe pro',
    category: 'Créatif',
    city: 'Ariana',
    bio: 'Portraits corporate et shooting produit e-commerce.',
    interests: ['Photo', 'Branding', 'Startup'],
    goals: ['proposer mes services', 'demander un service'],
    looking_for: 'proposer mes services photographie',
    activity_sector: 'Créatif',
    service_type: 'Photographie',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 36.85,
    lon: 10.2,
  },
  {
    email: 'mehdi.founder@matchy.seed',
    name: 'Mehdi Saidi',
    job: 'Founder SaaS',
    category: 'Tech',
    city: 'Tunis',
    bio: 'Je recrute des profils tech et cherche des partenaires business.',
    interests: ['Startup', 'Product', 'Networking', 'Invest'],
    goals: ["recruter quelqu'un", 'trouver un partenaire', 'lever des fonds'],
    looking_for: 'recruter hire et seek investment partenaires',
    activity_sector: 'Tech',
    service_type: 'Entrepreneuriat',
    profile_type: 'recruiter',
    image:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    plan: UserPlan.PREMIUM_PLUS,
    lat: 36.82,
    lon: 10.185,
  },
  {
    email: 'amira.hr@matchy.seed',
    name: 'Amira Chebbi',
    job: 'HR Business Partner',
    category: 'RH',
    city: 'Tunis',
    bio: 'Recrutement tech et freelances pour scale-ups tunisiennes.',
    interests: ['RH', 'Recrutement', 'Tech', 'Networking'],
    goals: ["recruter quelqu'un", 'rencontrer des personnes près de moi'],
    looking_for: 'recruter hire candidats tech',
    activity_sector: 'RH',
    service_type: 'Recrutement',
    profile_type: 'recruiter',
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 36.805,
    lon: 10.175,
  },
  {
    email: 'soft.mutual@matchy.seed',
    name: 'Sami Mutual',
    job: 'Mobile Developer',
    category: 'Tech',
    city: 'Tunis',
    bio: 'Flutter / React Native. Déjà matché avec le compte de test pour la page Matches.',
    interests: ['Mobile', 'Flutter', 'Product', 'Startup'],
    goals: ['trouver un job', 'proposer mes services'],
    looking_for: 'job emploi mission mobile',
    activity_sector: 'Tech',
    service_type: 'Développement mobile',
    profile_type: 'freelancer',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: 36.808,
    lon: 10.182,
  },
];

async function upsertUserWithLocation(
  prisma: PrismaClient,
  data: {
    email: string;
    passwordHash: string;
    name: string;
    role?: Role;
    status?: UserStatus;
    plan?: UserPlan;
    job?: string;
    category?: string;
    city?: string;
    bio?: string;
    image?: string;
    interests?: string[];
    goals?: string[];
    looking_for?: string;
    activity_sector?: string;
    service_type?: string;
    profile_type?: string;
    lat: number;
    lon: number;
  },
) {
  const user = await prisma.user.upsert({
    where: { email: data.email },
    create: {
      email: data.email,
      password: data.passwordHash,
      name: data.name,
      role: data.role ?? Role.USER,
      status: data.status ?? UserStatus.ACTIVE,
      plan: data.plan ?? UserPlan.FREE,
      job: data.job,
      category: data.category,
      city: data.city,
      bio: data.bio,
      image: data.image,
      interests: data.interests ?? [],
      goals: data.goals ?? [],
      looking_for: data.looking_for,
      activity_sector: data.activity_sector,
      service_type: data.service_type,
      profile_type: data.profile_type,
      gps_latitude: data.lat,
      gps_longitude: data.lon,
      rating: 4.5,
      languages: ['Français', 'Arabe'],
      contact_modes: ['call', 'café'],
    },
    update: {
      name: data.name,
      status: data.status ?? UserStatus.ACTIVE,
      plan: data.plan ?? UserPlan.FREE,
      job: data.job,
      category: data.category,
      city: data.city,
      bio: data.bio,
      image: data.image,
      interests: data.interests ?? [],
      goals: data.goals ?? [],
      looking_for: data.looking_for,
      activity_sector: data.activity_sector,
      service_type: data.service_type,
      profile_type: data.profile_type,
      gps_latitude: data.lat,
      gps_longitude: data.lon,
      role: data.role ?? Role.USER,
    },
  });

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
    plan: UserPlan.PREMIUM,
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
