import authReducer from '@/features/auth/store/auth-slice';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { INTRO_SEEN_KEY } from '@/features/onboarding/intro-storage';
import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OnboardingPage from './page';

const { pushMock, replaceMock, searchParamsRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsRef.current,
}));

const testProfile: OnboardingProfile = {
  id: 'user-1',
  name: 'Jane Doe',
  auth_provider: 'phone',
  job: 'Ingénieur',
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
  authPartial: Record<string, unknown> = {},
  onboardingPartial: Record<string, unknown> = {},
) {
  return configureStore({
    reducer: {
      auth: authReducer,
      onboarding: onboardingReducer,
    },
    preloadedState: {
      auth: {
        status: 'unauthenticated' as const,
        sessionChecked: true,
        user: null,
        error: null,
        loading: false,
        requiresVerification: false,
        verificationChannel: null,
        pendingUser: null,
        accessToken: null,
        sessionGeneration: 0,
        ...authPartial,
      },
      onboarding: {
        profile: null,
        loading: false,
        error: null,
        ...onboardingPartial,
      },
    },
  });
}

function renderPage(store = buildStore()) {
  return render(
    <I18nProvider>
      <Provider store={store}>
        <OnboardingPage />
      </Provider>
    </I18nProvider>,
  );
}

describe('OnboardingPage (/onboarding)', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    window.localStorage.removeItem(INTRO_SEEN_KEY);
    pushMock.mockClear();
    replaceMock.mockClear();
    searchParamsRef.current = new URLSearchParams();
  });

  afterEach(() => {
    window.localStorage.removeItem('matchy_locale');
    window.localStorage.removeItem(INTRO_SEEN_KEY);
    vi.clearAllMocks();
  });

  it('renders onboarding presentation when intro has not been seen', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Matchez autour de vous');
    expect(screen.getByTestId('onboarding-intro-next')).toBeInTheDocument();
  });

  it('redirects to /inscription when intro was already seen', () => {
    window.localStorage.setItem(INTRO_SEEN_KEY, 'true');

    renderPage();

    expect(replaceMock).toHaveBeenCalledWith('/inscription');
  });

  it('preserves next query parameter when bouncing already seen intro to /inscription', () => {
    window.localStorage.setItem(INTRO_SEEN_KEY, 'true');
    searchParamsRef.current = new URLSearchParams('next=%2Fprofile');

    renderPage();

    expect(replaceMock).toHaveBeenCalledWith('/inscription?next=%2Fprofile');
  });

  it('allows viewing presentation if force=true even when intro was seen', () => {
    window.localStorage.setItem(INTRO_SEEN_KEY, 'true');
    searchParamsRef.current = new URLSearchParams('force=true');

    renderPage();

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Matchez autour de vous');
  });

  it('redirects authenticated completed users to /home', () => {
    const store = buildStore(
      { status: 'authenticated', sessionChecked: true, user: { id: 'u1' } },
      { profile: { ...testProfile, onboardingCompleted: true } },
    );

    renderPage(store);

    expect(replaceMock).toHaveBeenCalledWith('/home');
  });

  it('marks intro as seen and navigates to /inscription when skip is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('onboarding-intro-skip'));

    expect(window.localStorage.getItem(INTRO_SEEN_KEY)).toBe('true');
    expect(pushMock).toHaveBeenCalledWith('/inscription');
  });
});
