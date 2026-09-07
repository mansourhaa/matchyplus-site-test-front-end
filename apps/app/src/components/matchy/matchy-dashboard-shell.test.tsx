import { LOCATION_COORDS_KEY, LOCATION_GRANTED_KEY } from '@/constants';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MatchyDashboardShell } from './matchy-dashboard-shell';

const { pushMock, replaceMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => '/home',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/i18n/i18n-provider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
  useI18n: () => ({ t: (key: string) => key, locale: 'fr', setLocale: vi.fn(), dir: 'ltr' }),
}));

// MatchyPrimaryShell/MatchyAppShell pull in the full matching/chat UI tree — irrelevant
// to the onboarding guard this test targets, so they're stubbed out.
vi.mock('./matchy-primary-shell', () => ({
  MatchyPrimaryShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="primary-shell">{children}</div>
  ),
}));
vi.mock('./matchy-app-shell', () => ({
  MatchyAppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

const onboardedUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: 'Jane Doe',
  auth_provider: 'phone',
  email_verified: false,
  verified: false,
  onboarding_completed: true,
};

describe('MatchyDashboardShell — onboarding guard & location gate', () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
    window.localStorage.setItem(LOCATION_GRANTED_KEY, '1');
    window.localStorage.setItem(
      LOCATION_COORDS_KEY,
      JSON.stringify({ latitude: 36.8, longitude: 10.1 }),
    );
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the dashboard when the user has completed onboarding and location is granted', () => {
    renderWithAuthStore(
      <MatchyDashboardShell>{<div>Dashboard content</div>}</MatchyDashboardShell>,
      {
        status: 'authenticated',
        user: onboardedUser,
      },
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('renders LocationRequiredOverlay as an overlay on top of the dashboard when location is not granted', () => {
    window.localStorage.removeItem(LOCATION_GRANTED_KEY);
    window.localStorage.removeItem(LOCATION_COORDS_KEY);

    renderWithAuthStore(
      <MatchyDashboardShell>{<div>Dashboard content</div>}</MatchyDashboardShell>,
      {
        status: 'authenticated',
        user: onboardedUser,
      },
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByText('Localisation requise')).toBeInTheDocument();
  });

  it('redirects to /onboarding instead of rendering when onboarding is incomplete', () => {
    renderWithAuthStore(
      <MatchyDashboardShell>{<div>Dashboard content</div>}</MatchyDashboardShell>,
      {
        status: 'authenticated',
        user: { ...onboardedUser, onboarding_completed: false },
      },
    );

    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/onboarding');
  });

  it('does not redirect or paint dashboard while the bootstrap authcheck has not settled yet', () => {
    renderWithAuthStore(
      <MatchyDashboardShell>{<div>Dashboard content</div>}</MatchyDashboardShell>,
      {
        status: 'unknown',
        sessionChecked: false,
        user: null,
      },
    );

    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('hard-navigates to /login once the session is known to be unauthenticated', () => {
    renderWithAuthStore(
      <MatchyDashboardShell>{<div>Dashboard content</div>}</MatchyDashboardShell>,
      {
        status: 'unauthenticated',
        sessionChecked: true,
        user: null,
      },
    );

    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    expect(assignMock).toHaveBeenCalledWith('/login?reason=session_expired');
  });
});
