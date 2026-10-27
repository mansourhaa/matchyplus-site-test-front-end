import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState } from '@/features/auth/types';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InscriptionPage from './page';

const {
  pushMock,
  replaceMock,
  refreshMock,
  searchParamsRef,
  registeredCallbackRef,
  onNextRef,
  isAuthenticatedPropRef,
  profilePropRef,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams() },
  registeredCallbackRef: { current: undefined as (() => void) | undefined },
  onNextRef: { current: undefined as ((patch: unknown) => Promise<boolean>) | undefined },
  isAuthenticatedPropRef: { current: undefined as boolean | undefined },
  profilePropRef: { current: undefined as unknown },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
  };
});

vi.mock('@/features/onboarding/components/identity-step', () => ({
  IdentityStep: (props: {
    isAuthenticated: boolean;
    profile: unknown;
    onRegistered?: () => void;
    onNext: (patch: unknown) => Promise<boolean>;
  }) => {
    registeredCallbackRef.current = props.onRegistered;
    onNextRef.current = props.onNext;
    isAuthenticatedPropRef.current = props.isAuthenticated;
    profilePropRef.current = props.profile;
    return <div data-testid="identity-step">Votre identité (stub)</div>;
  },
}));

vi.mock('@/features/onboarding/components/interests-step', () => ({
  InterestsStep: () => <div data-testid="interests-step">Vos centres d&apos;intérêt</div>,
}));

const incompleteUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: 'Test User',
  auth_provider: 'phone',
  email_verified: false,
  verified: false,
  onboarding_completed: false,
};

const fullProfile: OnboardingProfile = {
  id: 'user-1',
  name: 'Test User',
  auth_provider: 'phone',
  job: 'Électricien',
  bio: null,
  image: null,
  video: null,
  city: null,
  profile_type: 'INDIVIDUAL',
  offer_service: false,
  service_type: null,
  price: null,
  interests: [],
  selected_goals: [],
  availability_days: [],
  availability_hours: [],
  contact_modes: [],
  languages: [],
  onboardingCompleted: false,
};

function buildStore(
  authState: Partial<AuthState>,
  onboardingState: { profile?: OnboardingProfile | null } = {},
) {
  const defaultAuthState: AuthState = {
    status: 'unknown',
    loading: false,
    error: null,
    user: null,
    sessionChecked: true,
    sessionGeneration: 0,
  };
  return configureStore({
    reducer: { auth: authReducer, onboarding: onboardingReducer },
    preloadedState: {
      auth: { ...defaultAuthState, ...authState },
      onboarding: { loading: false, error: null, profile: onboardingState.profile ?? null },
    },
  });
}

function renderRegisterPage(
  authState: Partial<AuthState>,
  onboardingState: { profile?: OnboardingProfile | null } = {},
) {
  const store = buildStore(authState, onboardingState);
  render(
    <I18nProvider>
      <Provider store={store}>
        <InscriptionPage />
      </Provider>
    </I18nProvider>,
  );
  return store;
}

describe('InscriptionPage (/inscription)', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    window.localStorage.setItem('matchy_onboarding_intro_seen', 'true');
  });

  afterEach(() => {
    window.localStorage.removeItem('matchy_locale');
    window.localStorage.removeItem('matchy_onboarding_intro_seen');
    vi.clearAllMocks();
    searchParamsRef.current = new URLSearchParams();
    registeredCallbackRef.current = undefined;
    onNextRef.current = undefined;
    isAuthenticatedPropRef.current = undefined;
    profilePropRef.current = undefined;
  });

  it('renders the registration wizard directly for visitors who completed intro', () => {
    renderRegisterPage({ status: 'unauthenticated', user: null });

    expect(screen.getByTestId('identity-step')).toBeInTheDocument();
  });

  it('redirects first-time unauthenticated visitors from /inscription to /onboarding', () => {
    window.localStorage.removeItem('matchy_onboarding_intro_seen');
    renderRegisterPage({ status: 'unauthenticated', user: null });

    expect(replaceMock).toHaveBeenCalledWith('/onboarding');
  });

  it('allows unauthenticated users to start registration from /inscription once intro is completed', () => {
    renderRegisterPage({ status: 'unauthenticated', user: null });

    expect(isAuthenticatedPropRef.current).toBe(false);
    expect(screen.getByTestId('identity-step')).toBeInTheDocument();
  });

  it('allows authenticated users with incomplete profiles to continue setup from /inscription', () => {
    searchParamsRef.current = new URLSearchParams('step=interests');
    renderRegisterPage({ status: 'authenticated', user: incompleteUser }, { profile: fullProfile });

    expect(screen.getByTestId('interests-step')).toBeInTheDocument();
  });

  it('redirects authenticated completed users away from /inscription to /home by default', async () => {
    renderRegisterPage(
      {
        status: 'authenticated',
        user: { ...incompleteUser, onboarding_completed: true },
      },
      { profile: { ...fullProfile, onboardingCompleted: true } },
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/home');
    });
  });

  it('preserves a safe next destination when redirecting an already-completed user', async () => {
    searchParamsRef.current = new URLSearchParams('next=/matches');
    renderRegisterPage(
      {
        status: 'authenticated',
        user: { ...incompleteUser, onboarding_completed: true },
      },
      { profile: { ...fullProfile, onboardingCompleted: true } },
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/matches');
    });
  });

  it('sanitizes unsafe next destinations on /inscription to prevent open redirect', async () => {
    searchParamsRef.current = new URLSearchParams('next=//evil.example.com');
    renderRegisterPage(
      {
        status: 'authenticated',
        user: { ...incompleteUser, onboarding_completed: true },
      },
      { profile: { ...fullProfile, onboardingCompleted: true } },
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/home');
    });
  });

  it('does not redirect users away from /inscription once intro is completed', () => {
    renderRegisterPage({ status: 'unauthenticated', user: null });

    expect(replaceMock).not.toHaveBeenCalledWith(expect.stringContaining('/onboarding'));
    expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining('/onboarding'));

    // Verify resolvePostAuthDestination for incomplete profiles points to /inscription, not /onboarding
    expect(resolvePostAuthDestination(undefined, false)).toBe('/inscription');
    expect(resolvePostAuthDestination('/profile', false)).toBe('/inscription?next=%2Fprofile');
  });
});
