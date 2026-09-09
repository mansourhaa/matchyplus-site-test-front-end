'use client';

import { MatchyAppShell } from '@/components/matchy/matchy-app-shell';
import { MatchyPrimaryShell } from '@/components/matchy/matchy-primary-shell';
import { Spinner } from '@/components/shared/spinner';
import { useAppDispatch, useAppSelector, useProactiveRefresh } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  useAutoCaptureGrantedLocation,
  useLocationGate,
} from '@/features/location/location-context';
import { LocationRequiredOverlay } from '@/features/matching/components/location-required-overlay';
import {
  fetchOnboardingProfile,
  selectOnboarding,
} from '@/features/onboarding/store/onboarding-slice';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';

const PRIMARY_PATHS = new Set(['/home', '/matches', '/settings']);

function DashboardChrome({ children }: { children: ReactNode }) {
  useProactiveRefresh();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const isPrimary = PRIMARY_PATHS.has(pathname);
  const isMatchingRoute = pathname === '/home';
  useAutoCaptureGrantedLocation(isMatchingRoute);
  const { locationRequired, activating, accessMessage, requestBrowserLocation } = useLocationGate();

  // `user` is null until fetchCurrentUser resolves (see useBootstrapSession) — only
  // redirect once we actually know the profile is incomplete, not during that window.
  // This is every route under (dashboard) — the shell users actually hit.
  //
  // Also fail closed when the session check settled as unauthenticated (expired cookie
  // still present for proxy.ts, or logout left Redux cleared while a soft-nav bounced
  // back to /home). Hard-navigate so proxy sees a document request without racing
  // router.replace('/login') against a still-present access_token cookie.
  const { user, isAuthenticated, sessionChecked } = useAppSelector(selectAuth);
  const { profile, loading: profileLoading } = useAppSelector(selectOnboarding);
  const needsLogin = sessionChecked && !isAuthenticated;
  const needsOnboarding = Boolean(user && !user.onboarding_completed);
  // Fail closed: never paint (dashboard) chrome/children until authcheck settles,
  // and never after it settles unauthenticated or incomplete.
  const blockDashboard = !sessionChecked || needsLogin || needsOnboarding;

  useEffect(() => {
    if (isAuthenticated && !profile && !profileLoading) {
      void dispatch(fetchOnboardingProfile());
    }
  }, [isAuthenticated, profile, profileLoading, dispatch]);

  useEffect(() => {
    if (needsLogin) {
      window.location.assign('/login?reason=session_expired');
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
    '/home': searchParams.get('tab') === 'search' ? t('nav.search') : t('nav.home'),
    '/matches': t('nav.matches'),
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
    '/settings/notifications': t('settings.notifications'),
  };

  const title = pathname.startsWith('/chat')
    ? t('chat.title')
    : pathname.startsWith('/profile/')
      ? t('dashboard.profile')
      : titleMap[pathname] || t('nav.home');
  const isRootSettings = pathname === '/settings';
  const showBack = !isPrimary && !isRootSettings;
  const backPath =
    pathname === '/edit-profile' ||
    pathname.startsWith('/settings') ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-service'
      ? '/settings'
      : '/home';

  return (
    <>
      <MatchyAppShell
        title={title}
        showBack={showBack}
        backPath={backPath}
        hideHeader={pathname.startsWith('/chat') || pathname.startsWith('/profile/')}
      >
        {children}
      </MatchyAppShell>

      {isMatchingRoute && locationRequired && (
        <LocationRequiredOverlay
          message={accessMessage}
          onActivate={() => void requestBrowserLocation()}
          busy={activating}
        />
      )}
    </>
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
