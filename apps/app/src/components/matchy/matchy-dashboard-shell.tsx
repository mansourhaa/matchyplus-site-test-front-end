'use client';

import { MatchyAppShell } from '@/components/matchy/matchy-app-shell';
import { MatchyPrimaryShell } from '@/components/matchy/matchy-primary-shell';
import { Spinner } from '@/components/shared/spinner';
import { useAppSelector, useProactiveRefresh } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';

const PRIMARY_PATHS = new Set(['/home', '/matches']);

function DashboardChrome({ children }: { children: ReactNode }) {
  useProactiveRefresh();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const isPrimary = PRIMARY_PATHS.has(pathname);

  // `user` is null until fetchCurrentUser resolves (see useBootstrapSession) — only
  // redirect once we actually know the profile is incomplete, not during that window.
  // This is every route under (dashboard) — the shell users actually hit.
  //
  // Also fail closed when the session check settled as unauthenticated (expired cookie
  // still present for proxy.ts, or logout left Redux cleared while a soft-nav bounced
  // back to /home). Hard-navigate so proxy sees a document request without racing
  // router.replace('/login') against a still-present access_token cookie.
  const { user, isAuthenticated, sessionChecked } = useAppSelector(selectAuth);
  const needsLogin = sessionChecked && !isAuthenticated;
  const needsOnboarding = Boolean(user && !user.onboarding_completed);
  // Fail closed: never paint (dashboard) chrome/children until authcheck settles,
  // and never after it settles unauthenticated or incomplete.
  const blockDashboard = !sessionChecked || needsLogin || needsOnboarding;

  useEffect(() => {
    if (needsLogin) {
      window.location.assign('/login');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [needsLogin, needsOnboarding, router]);

  if (!sessionChecked) {
    return (
      <div
        className="bg-background flex min-h-screen items-center justify-center"
        style={{ background: '#F5F7FA' }}
      >
        <Spinner />
      </div>
    );
  }

  if (blockDashboard) {
    return null;
  }

  const titleMap: Record<string, string> = {
    '/settings': t('nav.settings'),
    '/settings/account': t('settings.account'),
    '/settings/password': t('dashboard.password'),
    '/settings/add-phone-number': t('dashboard.phone'),
    '/settings/video': t('settings.video'),
    '/settings/qr-code': t('settings.qrCode'),
    '/settings/verify-account': t('settings.verifyAccount'),
    '/settings/privacy': t('settings.privacy'),
    '/settings/history': t('settings.history'),
    '/settings/favorites': t('settings.favorites'),
    '/settings/plans': t('settings.subscription'),
    '/privacy-policy': t('settings.privacyPolicy'),
    '/terms-of-service': t('settings.terms'),
    '/settings/privacy-policy': t('settings.privacyPolicy'),
    '/settings/terms-of-service': t('settings.terms'),
    '/edit-profile': t('settings.editProfile'),
    '/notifications': t('settings.notifications'),
  };

  if (isPrimary) {
    return <MatchyPrimaryShell>{children}</MatchyPrimaryShell>;
  }

  const title = pathname.startsWith('/chat')
    ? t('chat.title')
    : pathname.startsWith('/profile/')
      ? t('dashboard.profile')
      : titleMap[pathname];

  const isSettingsSubpage =
    pathname.startsWith('/settings/') ||
    pathname === '/edit-profile' ||
    pathname === '/notifications' ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-service';

  const showBack = pathname !== '/settings';
  const backPath = isSettingsSubpage ? '/settings' : '/home';

  return (
    <MatchyAppShell
      title={title}
      showBack={showBack}
      backPath={backPath}
      hideHeader={pathname.startsWith('/chat') || pathname.startsWith('/profile/')}
    >
      {children}
    </MatchyAppShell>
  );
}

export function MatchyDashboardShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: '#F5F7FA' }}
        >
          {t('common.loading')}
        </div>
      }
    >
      <DashboardChrome>{children}</DashboardChrome>
    </Suspense>
  );
}
