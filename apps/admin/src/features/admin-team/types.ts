import type { AdminRole } from '@/features/admin-auth/types';

export type TeamRole = Exclude<AdminRole, 'SUPER_ADMIN'>;
export type TeamStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';

export interface AdminTeamMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AdminRole;
  status: TeamStatus;
  last_login: string | null;
  create_at: string;
}

export interface AdminTeamFilters {
  search: string;
}

export interface AdminTeamState {
  members: AdminTeamMember[];
  total: number;
  loading: boolean;
  creating: boolean;
  error: string | null;
  filters: AdminTeamFilters;
}

/** Never SUPER_ADMIN — that role is seeded separately, not creatable from the panel. */
export interface AdminCreateTeamMemberInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: TeamRole;
}

export interface AdminUpdateTeamMemberInput {
  name?: string;
  email?: string;
  phone?: string;
}
