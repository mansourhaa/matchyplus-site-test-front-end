import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import onboardingReducer, {
  completeOnboarding,
  fetchOnboardingProfile,
  updateOnboardingProfile,
} from './onboarding-slice';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
    },
  };
});

const profile = {
  id: 'user-1',
  name: 'Jane Doe',
  job: null,
  bio: null,
  image: null,
  city: null,
  profile_type: null,
  offer_service: false,
  service_type: null,
  price: null,
  interests: [] as string[],
  selected_goals: [] as string[],
  availability_days: [] as string[],
  availability_hours: [] as string[],
  contact_modes: [] as string[],
  languages: [] as string[],
  onboardingCompleted: false,
};

function buildStore() {
  return configureStore({ reducer: { onboarding: onboardingReducer } });
}

describe('onboarding-slice', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetchOnboardingProfile populates state.profile from GET /users/me/profile', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: profile });

    const store = buildStore();
    await store.dispatch(fetchOnboardingProfile());

    expect(api.get).toHaveBeenCalledWith('/users/me/profile', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    expect(store.getState().onboarding.profile).toEqual(profile);
  });

  it('updateOnboardingProfile sends the patch to PATCH /users/me/profile', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...profile, job: 'Électricien' } });

    const store = buildStore();
    await store.dispatch(updateOnboardingProfile({ job: 'Électricien' }));

    expect(api.patch).toHaveBeenCalledWith('/users/me/profile', { job: 'Électricien' });
    expect(store.getState().onboarding.profile?.job).toBe('Électricien');
  });

  it('completeOnboarding calls POST /users/me/profile/complete and stores the result', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { ...profile, onboardingCompleted: true } });

    const store = buildStore();
    await store.dispatch(completeOnboarding());

    expect(api.post).toHaveBeenCalledWith('/users/me/profile/complete');
    expect(store.getState().onboarding.profile?.onboardingCompleted).toBe(true);
  });

  it('completeOnboarding surfaces the API error code instead of a generic axios message', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'onboarding_incomplete' } },
    });

    const store = buildStore();
    await store.dispatch(completeOnboarding());

    expect(store.getState().onboarding.error).toBe('onboarding_incomplete');
  });

  it('updateOnboardingProfile falls back to a stable code when the API gives none', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Network Error'));

    const store = buildStore();
    await store.dispatch(updateOnboardingProfile({ job: 'Électricien' }));

    expect(store.getState().onboarding.error).toBe('onboarding_update_failed');
  });
});
