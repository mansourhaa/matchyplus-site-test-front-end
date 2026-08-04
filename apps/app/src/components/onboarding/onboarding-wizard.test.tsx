import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState } from '@/features/auth/types';
import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OnboardingWizard } from './onboarding-wizard';

const { pushMock, replaceMock, refreshMock, searchParamsRef, registeredCallbackRef } = vi.hoisted(
  () => ({
    pushMock: vi.fn(),
    replaceMock: vi.fn(),
    refreshMock: vi.fn(),
    searchParamsRef: { current: new URLSearchParams() },
    registeredCallbackRef: { current: undefined as (() => void) | undefined },
  }),
);

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

// Isolates the wizard's own orchestration (step gating, the fetch-vs-register-race fix)
// from IdentityStep's internal form/OTP complexity, which identity-step.test.tsx already
// covers in full. Captures the real onRegistered callback so a test can invoke it exactly
// like the real component does — right when registerPhone succeeds, before its onNext save.
vi.mock('./identity-step', () => ({
  IdentityStep: (props: { onRegistered?: () => void }) => {
    registeredCallbackRef.current = props.onRegistered;
    return <div>Votre identité (stub)</div>;
  },
}));

const registeredUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: '+21612345678',
  auth_provider: 'phone',
  email_verified: false,
  onboarding_completed: false,
};

const fullProfile = {
  id: 'user-1',
  name: 'Jane Doe',
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

function buildStore(authState: Partial<AuthState>) {
  const defaultAuthState: AuthState = {
    status: 'unknown',
    loading: false,
    error: null,
    user: null,
  };
  return configureStore({
    reducer: { auth: authReducer, onboarding: onboardingReducer },
    preloadedState: {
      auth: { ...defaultAuthState, ...authState },
    },
  });
}

function renderWizard(authState: Partial<AuthState>) {
  const store = buildStore(authState);
  render(
    <Provider store={store}>
      <OnboardingWizard />
    </Provider>,
  );
  return store;
}

describe('OnboardingWizard', () => {
  afterEach(() => {
    vi.clearAllMocks();
    searchParamsRef.current = new URLSearchParams();
    registeredCallbackRef.current = undefined;
  });

  it('ignores ?step=interests and renders identity for an unauthenticated visitor', () => {
    searchParamsRef.current = new URLSearchParams('step=interests');

    renderWizard({ status: 'unauthenticated', user: null });

    expect(screen.getByText('Votre identité (stub)')).toBeInTheDocument();
    expect(screen.queryByText('Vos objectifs')).not.toBeInTheDocument();
    // Fetching a brand-new visitor's profile would just 401 — never attempted.
    expect(api.get).not.toHaveBeenCalled();
  });

  it('honors ?step=interests and fetches the profile for an authenticated user', async () => {
    searchParamsRef.current = new URLSearchParams('step=interests');
    vi.mocked(api.get).mockResolvedValue({ data: fullProfile });

    renderWizard({ status: 'authenticated', user: registeredUser });

    // OnboardingStepLayout renders a desktop and a mobile copy of the step content (CSS
    // media queries don't apply in jsdom), plus its own progress-bar label — several
    // matches for this text is expected, same as interests-step.test.tsx's own helpers.
    expect((await screen.findAllByText('Vos objectifs'))[0]).toBeInTheDocument();
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/users/me/profile', expect.anything()),
    );
  });

  it('skips fetching the onboarding profile once a visitor registers mid-flow, since the identity save that follows is authoritative', async () => {
    searchParamsRef.current = new URLSearchParams();
    const store = renderWizard({ status: 'unauthenticated', user: null });

    expect(api.get).not.toHaveBeenCalled();

    // Mirrors the exact real-world ordering: registerPhone.fulfilled flips
    // isAuthenticated, and IdentityStep calls onRegistered synchronously right after,
    // before its own save — both happen before React ever runs the wizard's
    // fetch-on-authenticated effect.
    store.dispatch({ type: 'auth/registerPhone/fulfilled', payload: { user: registeredUser } });
    registeredCallbackRef.current?.();

    await waitFor(() => expect(screen.queryByText('Votre identité (stub)')).toBeInTheDocument());
    expect(api.get).not.toHaveBeenCalled();
  });
});
