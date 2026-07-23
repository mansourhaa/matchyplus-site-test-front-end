import type { UserStatus } from '@/features/admin-users/types';

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export interface ReportParty {
  id: string;
  name: string;
  email: string;
  image: string | null;
  status: UserStatus;
  city: string | null;
  job: string | null;
}

export interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  create_at: string;
  updated_at: string;
  reporter: ReportParty;
  reported: ReportParty;
}

export interface AdminReportsState {
  reports: AdminReport[];
  loading: boolean;
  error: string | null;
  statusFilter: 'all' | ReportStatus;
}
