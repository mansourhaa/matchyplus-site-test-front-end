import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardShell } from './dashboard-shell';

// @saas-boilerplate/ui's SidebarProvider uses a use-mobile hook that calls
// window.matchMedia — not implemented by jsdom.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

const { pushMock, replaceMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

// AppSidebar/ThemeToggle pull in the full shadcn sidebar tree — irrelevant to the
// onboarding guard this test targets, so they're stubbed out.
vi.mock('./app-sidebar', () => ({ AppSidebar: () => <nav data-testid="app-sidebar" /> }));
vi.mock('./theme-toggle', () => ({ ThemeToggle: () => null }));

const onboardedUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: 'Jane Doe',
  auth_provider: 'phone',
  email_verified: false,
  onboarding_completed: true,
};

describe('DashboardShell — onboarding guard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard when the user has completed onboarding', () => {
    renderWithAuthStore(<DashboardShell>{<div>Dashboard content</div>}</DashboardShell>, {
      user: onboardedUser,
    });

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /onboarding instead of rendering when onboarding is incomplete', () => {
    renderWithAuthStore(<DashboardShell>{<div>Dashboard content</div>}</DashboardShell>, {
      user: { ...onboardedUser, onboarding_completed: false },
    });

    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith('/onboarding');
  });

  it('does not redirect while the user has not been fetched yet', () => {
    renderWithAuthStore(<DashboardShell>{<div>Dashboard content</div>}</DashboardShell>, {
      user: null,
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
