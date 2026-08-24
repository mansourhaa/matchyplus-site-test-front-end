import { Prisma, PrismaClient, UserPlan } from '@saas-boilerplate/types';

/**
 * Ported from Matchy-FullStack's DEFAULT_PLANS (PlansContext / FunctionalDoc freemium).
 *
 * Interim product mode: every user is on FREE with freemium daily limits. Paid rows stay in
 * the catalog with `is_active: false` until the full business model / payments ship.
 *
 * The same FREE limits are applied by the `freemium_force_free_tier` migration for envs
 * that only run `prisma migrate deploy` (staging/production).
 */
export const DEFAULT_PLANS: Prisma.PlanCreateInput[] = [
  {
    id: UserPlan.FREE,
    name: 'Gratuit',
    price: 0,
    color: '#888888',
    is_active: true,
    badge: '',
    trial_days: 0,
    description: 'Accès gratuit avec limites journalières',
    features: [
      '3 profils visibles en recherche personnalisée',
      'Swipe limité (10/24h)',
      'Chat basique',
    ],
    swipes_per_day: 10,
    profiles_per_category: 3,
    messages_per_day: -1,
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
    is_active: false,
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
    is_active: false,
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

/**
 * Upserts plan catalog: creates missing rows and refreshes freemium interim fields
 * (FREE limits + paid is_active) without clobbering admin-edited prices on paid tiers.
 */
export async function seedPlans(prisma: PrismaClient) {
  for (const plan of DEFAULT_PLANS) {
    if (plan.id === UserPlan.FREE) {
      await prisma.plan.upsert({
        where: { id: plan.id },
        create: plan,
        update: {
          name: plan.name,
          description: plan.description,
          features: plan.features,
          swipes_per_day: plan.swipes_per_day,
          profiles_per_category: plan.profiles_per_category,
          messages_per_day: plan.messages_per_day,
          actions_per_day: plan.actions_per_day,
          boosts_per_month: plan.boosts_per_month,
          super_connects_per_month: plan.super_connects_per_month,
          is_active: true,
          price: 0,
        },
      });
      continue;
    }

    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: {
        is_active: false,
      },
    });
  }
}
