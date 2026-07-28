import bcrypt from 'bcryptjs';

import { Prisma, ReportStatus, Role, UserPlan, UserStatus } from '@saas-boilerplate/types';

import { prisma } from '../client.js';
import { seedMatching } from './matching.js';
import { seedPlans } from './plans.js';

/** Ported from the Matchy-FullStack admin mock data so the admin panel has realistic rows. */
const MEMBERS: Prisma.UserCreateInput[] = [
  {
    password: bcrypt.hashSync('passer'),
    email: 'karim.b@email.com',
    name: 'Karim B.',
    phone: '+216 55 678 901',
    job: 'Électricien',
    category: 'Électricité',
    city: 'Sfax',
    plan: UserPlan.PREMIUM_PLUS,
    status: UserStatus.ACTIVE,
    rating: 4.7,
    reviews: 89,
    matches: 32,
    total_earnings: 5600,
    missions: 24,
    image:
      'https://images.unsplash.com/photo-1708980047954-1400f412d67c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    interests: ['Installation', 'Dépannage', 'Tableaux électriques'],
    bio: "Électricien certifié avec 8 ans d'expérience. Interventions rapides, travaux résidentiels et industriels.",
    languages: ['Arabe', 'Français'],
    experience: '8 ans',
    schedule: 'Lun – Sam, 7h – 19h',
    contact_modes: ['call', 'café'],
    price: '40 DT/h',
    goals: ['proposer mes services', 'trouver un partenaire'],
    looking_for: 'proposer mes services électricité',
    activity_sector: 'Électricité',
    service_type: 'Électricité',
    profile_type: 'freelancer',
    gps_latitude: 34.7406,
    gps_longitude: 10.7603,
    last_login: new Date('2026-04-01'),
    create_at: new Date('2025-10-15'),
  },
  {
    password: bcrypt.hashSync('passer'),
    email: 'fatma.a@email.com',
    name: 'Fatma A.',
    phone: '+216 98 123 456',
    job: 'Aide Ménagère',
    category: 'Ménage',
    city: 'Tunis',
    plan: UserPlan.FREE,
    status: UserStatus.ACTIVE,
    rating: 5,
    reviews: 325,
    matches: 89,
    total_earnings: 4100,
    missions: 72,
    image:
      'https://images.unsplash.com/photo-1667549973015-9170543beea0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    interests: ['Ménage', 'Repassage', 'Cuisine'],
    bio: "15 ans d'expérience dans l'aide ménagère. Sérieuse, ponctuelle et discrète.",
    languages: ['Arabe', 'Français'],
    experience: '15 ans',
    schedule: 'Lun – Ven, 7h – 18h',
    contact_modes: ['call', 'café'],
    price: '15 DT/h',
    goals: ['proposer mes services', 'demander un service'],
    looking_for: 'proposer mes services ménage',
    activity_sector: 'Ménage',
    service_type: 'Aide ménagère',
    profile_type: 'freelancer',
    gps_latitude: 36.8065,
    gps_longitude: 10.1815,
    last_login: new Date('2026-03-28'),
    create_at: new Date('2026-01-08'),
  },
  {
    password: bcrypt.hashSync('passer'),
    email: 'ahmed.c@email.com',
    name: 'Ahmed C.',
    phone: '+216 25 789 012',
    job: 'Chef Cuisinier',
    category: 'Cuisine',
    city: 'Tunis',
    plan: UserPlan.PREMIUM,
    status: UserStatus.ACTIVE,
    rating: 4.8,
    reviews: 210,
    matches: 28,
    total_earnings: 7800,
    missions: 31,
    image:
      'https://images.unsplash.com/photo-1659100598135-66eb6e3b4d17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    interests: ['Traiteur', 'Événements', 'Tunisien'],
    bio: 'Chef expérimenté, spécialiste de la cuisine tunisienne.',
    languages: ['Arabe', 'Français'],
    experience: '10 ans',
    schedule: 'Ven – Dim, sur réservation',
    contact_modes: ['call', 'café'],
    price: '60 DT/event',
    goals: ['proposer mes services'],
    looking_for: 'proposer mes services cuisine traiteur',
    activity_sector: 'Cuisine',
    service_type: 'Traiteur',
    profile_type: 'freelancer',
    gps_latitude: 36.812,
    gps_longitude: 10.19,
    last_login: new Date('2026-03-30'),
    create_at: new Date('2025-12-20'),
  },
  {
    password: bcrypt.hashSync('passer'),
    email: 'bilel.m@email.com',
    name: 'Bilel M.',
    phone: '+216 44 234 567',
    job: 'Mécanicien Auto',
    category: 'Mécanique',
    city: 'Nabeul',
    plan: UserPlan.FREE,
    status: UserStatus.INACTIVE,
    rating: 4.7,
    reviews: 130,
    matches: 15,
    total_earnings: 1200,
    missions: 11,
    image:
      'https://images.unsplash.com/photo-1759497860802-9cba5782b455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    interests: ['Diagnostic', 'Vidange', 'Carrosserie'],
    bio: 'Mécanicien polyvalent, réparation toutes marques. Diagnostic rapide et prix honnêtes.',
    languages: ['Arabe', 'Français'],
    experience: '12 ans',
    schedule: 'Lun – Sam, 7h – 17h',
    contact_modes: ['call', 'café'],
    price: '20 DT/h',
    last_login: new Date('2026-02-15'),
    create_at: new Date('2025-09-30'),
  },
  {
    password: bcrypt.hashSync('passer'),
    email: 'sonia.r@email.com',
    name: 'Sonia R.',
    phone: '+216 33 456 789',
    job: "Nounou / Garde d'Enfants",
    category: 'Garde enfants',
    city: 'Tunis',
    plan: UserPlan.PREMIUM,
    status: UserStatus.ACTIVE,
    rating: 4.9,
    reviews: 245,
    matches: 63,
    total_earnings: 2800,
    missions: 55,
    image:
      'https://images.unsplash.com/photo-1722481735086-e1f8562d64cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    interests: ['Nourrissons', 'Devoirs', 'Activités'],
    bio: "Éducatrice certifiée avec 6 ans d'expérience. Douce, patiente et de confiance.",
    languages: ['Arabe', 'Français'],
    experience: '6 ans',
    schedule: 'Flexible',
    contact_modes: ['video', 'café', 'call'],
    price: '10 DT/h',
    goals: ['proposer mes services', 'trouver un job'],
    looking_for: 'proposer mes services garde enfants',
    activity_sector: 'Garde enfants',
    service_type: 'Nounou',
    profile_type: 'freelancer',
    gps_latitude: 36.81,
    gps_longitude: 10.18,
    last_login: new Date('2026-04-01'),
    create_at: new Date('2026-02-14'),
  },
  {
    password: bcrypt.hashSync('passer'),
    email: 'riadh.t@email.com',
    name: 'Riadh T.',
    phone: '+216 77 890 123',
    job: 'Plombier',
    category: 'Plomberie',
    city: 'Ariana',
    plan: UserPlan.FREE,
    status: UserStatus.BANNED,
    rating: 4.6,
    reviews: 188,
    matches: 8,
    total_earnings: 0,
    missions: 0,
    image:
      'https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    interests: ['Urgences', 'Installation', 'Fuites'],
    bio: "Plombier professionnel disponible 7j/7. Interventions urgentes et travaux d'installation.",
    languages: ['Arabe'],
    experience: '18 ans',
    schedule: '7j/7',
    contact_modes: ['call'],
    price: '35 DT/h',
    last_login: new Date('2026-01-20'),
    create_at: new Date('2025-08-11'),
  },
  {
    password: bcrypt.hashSync('passer'),
    email: 'ines.h@email.com',
    name: 'Ines H.',
    phone: '+216 66 012 345',
    job: 'Chauffeur VTC',
    category: 'Transport',
    city: 'Tunis',
    plan: UserPlan.PREMIUM_PLUS,
    status: UserStatus.ACTIVE,
    rating: 4.9,
    reviews: 62,
    matches: 41,
    total_earnings: 6100,
    missions: 29,
    image:
      'https://images.unsplash.com/photo-1728032038577-13053f714028?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    interests: ['Longue distance', 'Aéroport', 'Évènements'],
    bio: 'Chauffeur VTC professionnelle, véhicule climatisé. Ponctuelle, discrète et courtoise.',
    languages: ['Français', 'Anglais', 'Arabe'],
    experience: '4 ans',
    schedule: 'Mar – Sam, 6h – 22h',
    contact_modes: ['call', 'café'],
    price: '35 DT/trajet',
    goals: ['proposer mes services', 'rencontrer des personnes près de moi'],
    looking_for: 'proposer mes services transport VTC',
    activity_sector: 'Transport',
    service_type: 'VTC',
    profile_type: 'freelancer',
    gps_latitude: 36.8065,
    gps_longitude: 10.1815,
    last_login: new Date('2026-04-01'),
    create_at: new Date('2026-01-22'),
  },
];

/**
 * Admin passwords come from the environment. The documented demo values are only a
 * convenience for a developer machine, so they are used solely when NODE_ENV is explicitly
 * `development`; any other environment that reaches this seed has to supply the password
 * rather than get a publicly known one planted on its database.
 */
function adminPassword(variable: string, developmentDemo: string): string {
  const value = process.env[variable];
  if (value) return value;

  if (process.env['NODE_ENV'] === 'development') return developmentDemo;

  throw new Error(
    `Missing required environment variable: ${variable}. ` +
      'The demo admin password is only a fallback under NODE_ENV=development.',
  );
}

export default async function seedDev() {
  // Second line of defence behind the environment switch in `index.ts`: this seed creates
  // admin accounts, so it must never run against a shared environment even if it is called
  // directly.
  if (process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'staging') {
    throw new Error(
      `Refusing to run the development seed with NODE_ENV=${process.env['NODE_ENV']}`,
    );
  }

  // Plans are configuration rather than sample data, so upserting keeps this re-runnable
  // and keeps any locally edited plan from blocking the seed.
  await seedPlans(prisma);

  await prisma.user.upsert({
    where: { email: 'itskhvlil@outlook.com' },
    create: {
      password: bcrypt.hashSync('passer'),
      email: 'itskhvlil@outlook.com',
      name: 'Khalil Bchir',
      status: UserStatus.ACTIVE,
      role: Role.USER,
      job: 'Founder',
      category: 'Tech',
      city: 'Tunis',
      goals: ["recruter quelqu'un", 'trouver un prestataire'],
      looking_for: 'recruter hire prestataires tech',
      activity_sector: 'Tech',
      service_type: 'Product',
      profile_type: 'recruiter',
      gps_latitude: 36.8065,
      gps_longitude: 10.1815,
      interests: ['Startup', 'Product', 'Networking'],
    },
    update: {
      status: UserStatus.ACTIVE,
      job: 'Founder',
      category: 'Tech',
      city: 'Tunis',
      goals: ["recruter quelqu'un", 'trouver un prestataire'],
      looking_for: 'recruter hire prestataires tech',
      activity_sector: 'Tech',
      service_type: 'Product',
      profile_type: 'recruiter',
      gps_latitude: 36.8065,
      gps_longitude: 10.1815,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@matchyplus.tn' },
    create: {
      password: bcrypt.hashSync(adminPassword('SEED_SUPER_ADMIN_PASSWORD', 'matchy2026')),
      email: 'admin@matchyplus.tn',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
    update: {
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'mod@matchyplus.tn' },
    create: {
      password: bcrypt.hashSync(adminPassword('SEED_MODERATOR_PASSWORD', 'mod2026')),
      email: 'mod@matchyplus.tn',
      name: 'Moderateur',
      role: Role.MODERATOR,
    },
    update: {
      role: Role.MODERATOR,
    },
  });

  const members: Array<{ id: string; email: string }> = [];
  for (const member of MEMBERS) {
    const { password: _password, email, ...rest } = member;
    const row = await prisma.user.upsert({
      where: { email },
      create: member,
      update: { ...rest },
    });
    members.push({ id: row.id, email: row.email });

    if (
      rest.gps_latitude != null &&
      rest.gps_longitude != null &&
      rest.status === UserStatus.ACTIVE
    ) {
      await prisma.userLocation.upsert({
        where: { user_id: row.id },
        create: {
          user_id: row.id,
          latitude: rest.gps_latitude,
          longitude: rest.gps_longitude,
          location_enabled: true,
          city: typeof rest.city === 'string' ? rest.city : undefined,
          country: 'Tunisia',
        },
        update: {
          latitude: rest.gps_latitude,
          longitude: rest.gps_longitude,
          location_enabled: true,
          city: typeof rest.city === 'string' ? rest.city : undefined,
        },
      });
    }
  }

  // Sample reports so the "Signalements" admin section is demonstrable.
  const byEmail = (email: string) => members.find((m) => m.email === email)!;
  const riadh = byEmail('riadh.t@email.com');
  const bilel = byEmail('bilel.m@email.com');

  const existingReports = await prisma.report.count({
    where: {
      OR: [{ reported_id: riadh.id }, { reported_id: bilel.id }],
    },
  });
  if (existingReports === 0) {
    await prisma.report.createMany({
      data: [
        {
          reporter_id: byEmail('fatma.a@email.com').id,
          reported_id: riadh.id,
          reason: 'Comportement inapproprié',
          details: 'Messages insistants et déplacés après un premier contact.',
          status: ReportStatus.PENDING,
        },
        {
          reporter_id: byEmail('ines.h@email.com').id,
          reported_id: riadh.id,
          reason: 'Faux profil',
          details: 'Les photos ne correspondent pas à la personne rencontrée.',
          status: ReportStatus.PENDING,
        },
        {
          reporter_id: byEmail('sonia.r@email.com').id,
          reported_id: bilel.id,
          reason: 'Spam',
          details: 'Envoie des liens publicitaires en boucle.',
          status: ReportStatus.REVIEWED,
        },
      ],
    });
  }

  const matching = await seedMatching(prisma);
  console.log(
    `[seed] matching demo ready — login ${matching.testerEmail} / ${matching.testerPassword} (${matching.profileCount} nearby profiles + 1 match)`,
  );
}
