import { Role, UserPlan, UserStatus } from '@saas-boilerplate/types';

/** The admin performing the action, taken from the verified token — never from the request body. */
export type AdminActor = {
  id: string;
  role: Role;
};

export type AdminListUsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  plan?: UserPlan;
  category?: string;
};

export type AdminUpdateUserPayload = {
  name?: string;
  email?: string;
  phone?: string;
  job?: string;
  category?: string;
  city?: string;
  bio?: string;
  experience?: string;
  schedule?: string;
  price?: string;
  status?: UserStatus;
  // `plan` is deliberately absent: it is not part of the generic update contract.
};

export type AdminUpdateUserStatusPayload = {
  status: UserStatus;
};

export type AdminUserStatsResult = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  bannedUsers: number;
  freeUsers: number;
  premiumUsers: number;
  premiumPlusUsers: number;
};

export type AdminUpdatePlanPayload = {
  name?: string;
  price?: number;
  color?: string;
  is_active?: boolean;
  badge?: string;
  trial_days?: number;
  description?: string;
  features?: string[];
  swipes_per_day?: number;
  profiles_per_category?: number;
  messages_per_day?: number;
  actions_per_day?: number;
  boosts_per_month?: number;
  super_connects_per_month?: number;
};

export type AdminChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type AdminAnalyticsResult = {
  /** Signups per calendar month, oldest first. */
  signupsTimeline: Array<{ month: string; users: number }>;
  /** Cumulative users and estimated MRR per month, oldest first (dashboard evolution chart). */
  platformTimeline: Array<{ month: string; users: number; revenue: number }>;
  /** Month-over-month percentage change for the stat-card badges; null when < 2 months of data. */
  trends: {
    users: number;
    revenue: number;
    matches: number;
    conversion: number;
  } | null;
  categoryDistribution: Array<{ name: string; value: number }>;
  matchesByCategory: Array<{ name: string; value: number }>;
  topCities: Array<{ city: string; users: number }>;
  /** Monthly recurring revenue estimated from plan price × subscriber count. */
  revenueByPlan: Array<{ plan: string; users: number; monthlyRevenue: number }>;
  totalMatches: number;
  estimatedMonthlyRevenue: number;
};
