export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';
export type UserPlan = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

export interface AdminManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  plan: UserPlan;
  phone: string | null;
  job: string | null;
  category: string | null;
  city: string | null;
  bio: string | null;
  image: string | null;
  interests: string[];
  languages: string[];
  contact_modes: string[];
  experience: string | null;
  schedule: string | null;
  price: string | null;
  rating: number;
  reviews: number;
  matches: number;
  missions: number;
  total_earnings: number;
  last_login: string | null;
  create_at: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  bannedUsers: number;
  freeUsers: number;
  premiumUsers: number;
  premiumPlusUsers: number;
}

export interface AdminUserFilters {
  search: string;
  plan: 'all' | UserPlan;
  status: 'all' | UserStatus;
}

export interface AdminUsersState {
  users: AdminManagedUser[];
  total: number;
  stats: AdminStats | null;
  selectedUser: AdminManagedUser | null;
  loadingUsers: boolean;
  loadingStats: boolean;
  error: string | null;
  filters: AdminUserFilters;
}

/** Editable subset of the detail panel form. */
export type AdminUserUpdate = Partial<
  Pick<
    AdminManagedUser,
    | 'name'
    | 'email'
    | 'phone'
    | 'job'
    | 'category'
    | 'city'
    | 'bio'
    | 'experience'
    | 'schedule'
    | 'price'
    | 'status'
  >
>;
