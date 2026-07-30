'use client';

import { MatchyAppShell } from '@/components/matchy/matchy-app-shell';
import { MatchyPrimaryShell } from '@/components/matchy/matchy-primary-shell';
import { useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';

const PRIMARY_PATHS = new Set(['/home', '/matches']);

function DashboardChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const isPrimary = PRIMARY_PATHS.has(pathname);

  // `user` is null until fetchCurrentUser resolves (see useBootstrapSession) — only
  // redirect once we actually know the profile is incomplete, not during that window.
  // This is every route under (dashboard) — the shell users actually hit
  const { user } = useAppSelector(selectAuth);
  const needsOnboarding = Boolean(user && !user.onboarding_completed);

  useEffect(() => {
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [needsOnboarding, router]);

  if (needsOnboarding) {
    return null;
  }

  const titleMap: Record<string, string> = {
    '/settings': t('nav.settings'),
    '/edit-profile': t('settings.editProfile'),
    '/account-profile': t('settings.account'),
    '/password': 'Password',
    '/email': 'Email',
    '/privacy': t('settings.privacy'),
    '/notifications': t('settings.notifications'),
    '/history': t('settings.history'),
    '/qr-code': t('settings.qrCode'),
    '/video-settings': t('settings.video'),
    '/add-phone-number': 'Phone',
    '/verify-account': t('settings.verifyAccount'),
    '/favorites': t('settings.favorites'),
    '/wallet': 'Wallet',
    '/plans': t('settings.subscription'),
    '/plan-free': 'Free',
    '/plan-premium': 'Premium',
    '/plan-premium-plus': 'Premium+',
    '/privacy-policy': t('settings.privacyPolicy'),
    '/terms-of-service': t('settings.terms'),
  };

  if (isPrimary) {
    return <MatchyPrimaryShell>{children}</MatchyPrimaryShell>;
  }

  const title = pathname.startsWith('/chat')
    ? t('chat.title')
    : pathname.startsWith('/profile/')
      ? 'Profil'
      : titleMap[pathname];
  const backPath =
    pathname === '/edit-profile' || pathname === '/video-settings' ? '/settings' : '/home';

  return (
    <MatchyAppShell
      title={title}
      backPath={backPath}
      hideHeader={pathname.startsWith('/chat') || pathname.startsWith('/profile/')}
    >
      {children}
    </MatchyAppShell>
  );
}

export function MatchyDashboardShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: '#F5F7FA' }}
        >
          Loading…
        </div>
      }
    >
      <DashboardChrome>{children}</DashboardChrome>
    </Suspense>
  );
}
