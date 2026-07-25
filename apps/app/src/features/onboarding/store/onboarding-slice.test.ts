import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import onboardingReducer, {
  completeOnboarding,
  fetchOnboardingProfile,
  updateOnboardingProfile,
} from './onboarding-slice';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

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
  sector: null,
  price: null,
  interests: [] as string[],
  selected_goals: [] as string[],
  experience: null,
  experiences: null,
  education_level: null,
  educations: null,
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

    expect(api.get).toHaveBeenCalledWith('/users/me/profile');
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
});
