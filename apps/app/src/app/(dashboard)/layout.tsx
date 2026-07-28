import { MatchyDashboardShell } from '@/components/matchy/matchy-dashboard-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MatchyDashboardShell>{children}</MatchyDashboardShell>;
}
