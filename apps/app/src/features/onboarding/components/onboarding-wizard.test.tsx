import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState } from '@/features/auth/types';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardingWizard } from './onboarding-wizard';

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

// Isolates the wizard's own orchestration (step gating, the fetch-vs-register-race fix)
// from IdentityStep's internal form/OTP complexity, which identity-step.test.tsx already
// covers in full. Captures the real onRegistered/onNext callbacks so a test can invoke
// them exactly like the real component does — onRegistered right when registerPhone
// succeeds, onNext once its own identity save is ready to run.
vi.mock('./identity-step', () => ({
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
  verified: false,
  onboarding_completed: false,
};

const fullProfile: OnboardingProfile = {
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

function buildStore(
  authState: Partial<AuthState>,
  onboardingState: { profile?: OnboardingProfile | null } = {},
) {
  const defaultAuthState: AuthState = {
    status: 'unknown',
    loading: false,
    error: null,
    user: null,
    // Most tests here are exercising step-gating, not the rehydration race itself —
    // default to "checked" so passing status: 'authenticated' alone still behaves as a
    // validated session. Tests exercising the race pass sessionChecked: false explicitly.
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

function renderWizard(
  authState: Partial<AuthState>,
  onboardingState: { profile?: OnboardingProfile | null } = {},
) {
  const store = buildStore(authState, onboardingState);
  render(
    <I18nProvider>
      <Provider store={store}>
        <OnboardingWizard />
      </Provider>
    </I18nProvider>,
  );
  return store;
}

describe('OnboardingWizard', () => {
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

  it('stays on identity, ignoring a stale ?step=interests, while the post-register save is still in flight', async () => {
    searchParamsRef.current = new URLSearchParams('step=interests');
    const store = renderWizard({ status: 'unauthenticated', user: null });

    store.dispatch({ type: 'auth/registerPhone/fulfilled', payload: { user: registeredUser } });
    registeredCallbackRef.current?.();

    // isAuthenticated is now true and ?step=interests is present, but the save hasn't
    // resolved yet — identity (OTP modal included) must not be torn down.
    await waitFor(() => expect(screen.getByText('Votre identité (stub)')).toBeInTheDocument());
    expect(screen.queryByText('Vos objectifs')).not.toBeInTheDocument();
  });

  it('clears the sticky guard and navigates normally once the post-register save succeeds', async () => {
    searchParamsRef.current = new URLSearchParams();
    vi.mocked(api.patch).mockResolvedValue({ data: fullProfile });
    const store = renderWizard({ status: 'unauthenticated', user: null });

    act(() => {
      store.dispatch({ type: 'auth/registerPhone/fulfilled', payload: { user: registeredUser } });
      registeredCallbackRef.current?.();
    });
    // Re-render lands with isAuthenticated=true and justRegisteredRef still true — grab
    // this render's onNext (goToNextStep), the same one IdentityStep would actually call.
    await act(async () => {
      await onNextRef.current?.({ name: 'Jane Doe', profileType: 'INDIVIDUAL' });
    });

    // The successful save clears the sticky guard and advances exactly like a normal
    // (already-authenticated) save would — the guard only ever blocks the brief
    // in-flight window, never navigation after a real success.
    expect(pushMock).toHaveBeenCalledWith('/inscription?step=interests');
  });

  it('does not honor a deep-linked step for a persisted-but-unvalidated session, and does not fetch its profile', () => {
    searchParamsRef.current = new URLSearchParams('step=interests');

    // redux-persist can rehydrate a stale `status: 'authenticated'` before
    // useBootstrapSession's fetchCurrentUser call confirms the cookie is still valid —
    // sessionChecked stays false during that window. Honoring ?step= here would let an
    // expired session briefly hit an authenticated-only API that just 401s.
    renderWizard({ status: 'authenticated', sessionChecked: false, user: registeredUser });

    expect(screen.getByText('Votre identité (stub)')).toBeInTheDocument();
    expect(screen.queryByText('Vos objectifs')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('honors the deep-linked step and fetches the profile once the session is validated', async () => {
    searchParamsRef.current = new URLSearchParams('step=interests');
    vi.mocked(api.get).mockResolvedValue({ data: fullProfile });

    const store = renderWizard({
      status: 'authenticated',
      sessionChecked: false,
      user: registeredUser,
    });

    expect(screen.getByText('Votre identité (stub)')).toBeInTheDocument();

    // fetchCurrentUser.fulfilled: the bootstrap authcheck settles and confirms the
    // cookie is still valid.
    act(() => {
      store.dispatch({
        type: 'auth/fetchCurrentUser/fulfilled',
        // generationAtStart must match the store's current sessionGeneration (0, the
        // default from buildStore) — auth-slice discards a fulfilled/rejected response
        // whose generation is stale, so a raw dispatch without it would otherwise be a
        // no-op against the real reducer.
        payload: { user: registeredUser, generationAtStart: 0 },
      });
    });

    expect((await screen.findAllByText('Vos objectifs'))[0]).toBeInTheDocument();
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/users/me/profile', expect.anything()),
    );
  });

  it('passes a validated isAuthenticated (not persist-only) into IdentityStep, so a stale session cannot hide signup credentials', () => {
    // status: 'authenticated' alone (e.g. rehydrated by redux-persist before the
    // bootstrap authcheck confirms the cookie) must not read as authenticated inside
    // IdentityStep — otherwise it would hide the phone/password fields, weaken the
    // phone-signup photo rule, and route the save through the wrong (PATCH) path for a
    // session that turns out to be expired.
    renderWizard({ status: 'authenticated', sessionChecked: false, user: registeredUser });

    expect(isAuthenticatedPropRef.current).toBe(false);
  });

  it('passes isAuthenticated: true into IdentityStep once the session is actually validated', () => {
    renderWizard({ status: 'authenticated', sessionChecked: true, user: registeredUser });

    expect(isAuthenticatedPropRef.current).toBe(true);
  });

  it('does not redirect away from identity, or leak a stale completed profile into it, for an unvalidated session', () => {
    // Onboarding's own Redux state is only cleared on an explicit logout/resetAuthState
    // (see onboarding-slice's resetForNewSession) — a completed profile from a *previous*
    // session (soft logout via client navigation) can still be sitting in memory for a
    // brief moment. Without gating on hasValidatedSession, this would immediately bounce
    // a fresh anonymous signup away from identity, or pre-fill its fields.
    const staleCompletedProfile = { ...fullProfile, onboardingCompleted: true };

    renderWizard({ status: 'unauthenticated', user: null }, { profile: staleCompletedProfile });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText('Votre identité (stub)')).toBeInTheDocument();
    expect(profilePropRef.current).toBeNull();
  });

  it('does the same for a persisted-but-unvalidated session (status authenticated, sessionChecked false)', () => {
    const staleCompletedProfile = { ...fullProfile, onboardingCompleted: true };

    renderWizard(
      { status: 'authenticated', sessionChecked: false, user: registeredUser },
      { profile: staleCompletedProfile },
    );

    expect(replaceMock).not.toHaveBeenCalled();
    expect(profilePropRef.current).toBeNull();
  });

  it('does redirect and pass the real profile through once the session is actually validated', () => {
    const completedProfile = { ...fullProfile, onboardingCompleted: true };

    renderWizard(
      { status: 'authenticated', sessionChecked: true, user: registeredUser },
      { profile: completedProfile },
    );

    expect(replaceMock).toHaveBeenCalledWith('/home');
  });

  it('renders onboarding presentation for first-time visitors before identity', () => {
    window.localStorage.removeItem('matchy_onboarding_intro_seen');
    searchParamsRef.current = new URLSearchParams();

    renderWizard({ status: 'unauthenticated', user: null });

    expect(
      screen.getByRole('region', { name: /Matching Intelligent Géolocalisé/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-intro-skip')).toBeInTheDocument();
    expect(screen.queryByText('Votre identité (stub)')).not.toBeInTheDocument();
  });

  it('transitions from presentation to identity when skip is clicked', () => {
    window.localStorage.removeItem('matchy_onboarding_intro_seen');
    searchParamsRef.current = new URLSearchParams();

    renderWizard({ status: 'unauthenticated', user: null });

    const skipButton = screen.getByTestId('onboarding-intro-skip');
    act(() => {
      skipButton.click();
    });

    expect(window.localStorage.getItem('matchy_onboarding_intro_seen')).toBe('true');
    expect(screen.getByText('Votre identité (stub)')).toBeInTheDocument();
  });
});
