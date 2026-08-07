import { MatchyDashboardShell } from '@/components/matchy/matchy-dashboard-shell';
import { AUTH_COOKIE } from '@/lib/auth';
import { hasUsableAccessTokenCookie } from '@/lib/route-auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server-side fail-closed gate for every route under `(dashboard)`.
 * Cookie presence/expiry is checked here so RSC never serves dashboard HTML
 * without a usable session — even if the edge proxy is skipped. Signature
 * validity is confirmed by the API via AuthBootstrap → fetchCurrentUser; the
 * client shell then hard-navigates to /login if that settles unauthenticated.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!hasUsableAccessTokenCookie(token)) {
    redirect('/login');
  }

  return <MatchyDashboardShell>{children}</MatchyDashboardShell>;
}
