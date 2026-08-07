import { Prisma, PrismaClient, UserPlan } from '@saas-boilerplate/types';

/**
 * Ported from Matchy-FullStack's DEFAULT_PLANS (PlansContext).
 *
 * Plans are configuration, not sample data: every environment needs these three rows or
 * `/admin/plans` comes up empty and plan edition has nothing to update. The same values are
 * inserted by the `seed_default_plans` migration, which is what actually runs in staging and
 * production (the deploy pipeline runs `prisma migrate deploy` only, never a seed).
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

/**
 * Idempotent: creates a missing plan and leaves an existing one untouched, so re-running a
 * seed never overwrites prices an admin has since edited from the panel.
 */
export async function seedPlans(prisma: PrismaClient) {
  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({ where: { id: plan.id }, create: plan, update: {} });
  }
}
