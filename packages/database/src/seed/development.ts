import bcrypt from 'bcryptjs';

import { Prisma, ReportStatus, Role, UserPlan, UserStatus } from '@saas-boilerplate/types';

import { prisma } from '../client.js';

/** Ported from Matchy-FullStack's DEFAULT_PLANS (PlansContext). */
const PLANS: Prisma.PlanCreateInput[] = [
  {
    id: UserPlan.FREE,
    name: 'Gratuit',
    price: 0,
    color: '#888888',
    is_active: true,
    badge: '',
    trial_days: 0,
    description: 'Accès limité aux fonctionnalités de base',
    features: ['3 profils visibles par catégorie', 'Swipe limité (20/jour)', 'Chat basique'],
    swipes_per_day: 20,
    profiles_per_category: 3,
    messages_per_day: 5,
    actions_per_day: 10,
    boosts_per_month: 0,
    super_connects_per_month: 0,
    sort_order: 0,
  },
  {
    id: UserPlan.PREMIUM,
    name: 'Premium',
    price: 9.9,
    color: '#2F76BB',
    is_active: true,
    badge: 'Populaire',
    trial_days: 7,
    description: 'Accès complet aux profils et connexions',
    features: [
      'Profils illimités',
      'Swipe illimité',
      'Se connecter sans restriction',
      'Voir les modes de contact',
      'Messagerie vidéo',
      'Boost profil × 1/mois',
    ],
    swipes_per_day: -1,
    profiles_per_category: -1,
    messages_per_day: -1,
    actions_per_day: -1,
    boosts_per_month: 1,
    super_connects_per_month: 0,
    sort_order: 1,
  },
  {
    id: UserPlan.PREMIUM_PLUS,
    name: 'Premium+',
    price: 19.9,
    color: '#F5A623',
    is_active: true,
    badge: 'Meilleure valeur',
    trial_days: 14,
    description: 'Accès total + avantages exclusifs',
    features: [
      'Tout Premium inclus',
      'Profil mis en avant',
      'Accès admin lite',
      '5 Super Connexions/mois',
      'Statistiques avancées',
      'Support prioritaire',
    ],
    swipes_per_day: -1,
    profiles_per_category: -1,
    messages_per_day: -1,
    actions_per_day: -1,
    boosts_per_month: 3,
    super_connects_per_month: 5,
    sort_order: 2,
  },
];

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
    city: 'Sousse',
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
    last_login: new Date('2026-04-01'),
    create_at: new Date('2026-01-22'),
  },
];

export default async function seedDev() {
  // Plans are configuration rather than sample data, so upserting keeps this re-runnable
  // and keeps any locally edited plan from blocking the seed.
  for (const plan of PLANS) {
    await prisma.plan.upsert({ where: { id: plan.id }, create: plan, update: {} });
  }

  await prisma.user.create({
    data: {
      password: bcrypt.hashSync('passer'),
      email: 'itskhvlil@outlook.com',
      name: 'Khalil Bchir',
    },
  });

  await prisma.user.create({
    data: {
      password: bcrypt.hashSync('matchy2026'),
      email: 'admin@matchyplus.tn',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      password: bcrypt.hashSync('mod2026'),
      email: 'mod@matchyplus.tn',
      name: 'Moderateur',
      role: Role.MODERATOR,
    },
  });

  const members: Array<{ id: string; email: string }> = [];
  for (const member of MEMBERS) {
    members.push(await prisma.user.create({ data: member }));
  }

  // Sample reports so the "Signalements" admin section is demonstrable: a couple of members
  // flagging the same reported account (to show the per-user grouping and multiple reporters).
  const byEmail = (email: string) => members.find((m) => m.email === email)!;
  const riadh = byEmail('riadh.t@email.com');
  const bilel = byEmail('bilel.m@email.com');

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
