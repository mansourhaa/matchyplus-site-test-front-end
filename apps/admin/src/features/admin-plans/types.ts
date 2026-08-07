import type { UserPlan } from '@/features/admin-users/types';

export interface AdminPlan {
  id: UserPlan;
  name: string;
  price: number;
  color: string;
  is_active: boolean;
  badge: string;
  trial_days: number;
  description: string;
  features: string[];
  swipes_per_day: number;
  profiles_per_category: number;
  messages_per_day: number;
  actions_per_day: number;
  boosts_per_month: number;
  super_connects_per_month: number;
  sort_order: number;
}

/** Limit fields share an editor row; -1 means unlimited. */
export type PlanLimitField =
  | 'swipes_per_day'
  | 'profiles_per_category'
  | 'messages_per_day'
  | 'actions_per_day'
  | 'boosts_per_month'
  | 'super_connects_per_month';

export type AdminPlanUpdate = Partial<Omit<AdminPlan, 'id' | 'sort_order'>>;

export interface AdminPlansState {
  plans: AdminPlan[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  savedAt: string | null;
}

export function formatPrice(price: number): string {
  return price === 0 ? 'Gratuit' : `${price.toFixed(2)} DT`;
}

export function formatLimit(value: number): string {
  return value === -1 ? 'Illimité' : String(value);
}
