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
  onboarding_completed: true,
};

describe('MatchyDashboardShell — onboarding guard', () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('location', { ...window.location, assign: assignMock });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the dashboard when the user has completed onboarding', () => {
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
    expect(assignMock).toHaveBeenCalledWith('/login');
  });
});
