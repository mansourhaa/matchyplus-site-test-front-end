import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import onboardingReducer, {
  analyzeProfileVideo,
  clearVideoAnalysis,
  completeOnboarding,
  fetchOnboardingProfile,
  relabelVideoAnalysis,
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

  describe('session reset', () => {
    it("clears the profile on logout, so a fresh anonymous visitor never sees a previous session's completed profile", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: profile });
      const store = buildStore();
      await store.dispatch(fetchOnboardingProfile());
      expect(store.getState().onboarding.profile).not.toBeNull();

      store.dispatch({ type: 'auth/logout/fulfilled' });

      expect(store.getState().onboarding.profile).toBeNull();
    });

    it('clears the profile on resetAuthState (e.g. a failed token refresh)', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: profile });
      const store = buildStore();
      await store.dispatch(fetchOnboardingProfile());

      store.dispatch({ type: 'auth/resetAuthState' });

      expect(store.getState().onboarding.profile).toBeNull();
    });

    it('does not clear the profile on a stale fetchCurrentUser rejection, since that would race a signup in progress', async () => {
      // The bootstrap authcheck can still be in flight when a fresh visitor finishes
      // phone signup on /register — a late (correctly stale) rejection must not wipe
      // the profile that signup just started building. See sessionGeneration in
      // auth-slice.ts, which already prevents that same response from clearing the
      // session itself.
      vi.mocked(api.get).mockResolvedValue({ data: profile });
      const store = buildStore();
      await store.dispatch(fetchOnboardingProfile());

      store.dispatch({ type: 'auth/fetchCurrentUser/rejected' });

      expect(store.getState().onboarding.profile).toEqual(profile);
    });
  });
});

const clip = () => new File([new Uint8Array([1, 2, 3])], 'clip.webm', { type: 'video/webm' });

describe('onboarding-slice video analysis', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('sends the clip before any account exists, polls with its token and keeps only sure fields', async () => {
    vi.useFakeTimers();
    vi.mocked(api.post).mockResolvedValue({
      data: { job: { id: 'job-1', status: 'QUEUED', result: null, error: null }, token: 't0k3n' },
    });
    vi.mocked(api.get).mockResolvedValue({
      data: {
        job: {
          id: 'job-1',
          status: 'SUCCEEDED',
          error: null,
          result: {
            ok: true,
            profile: {
              profession: { value: 'menage.aide_menagere', label: 'Aide ménagère', status: 'fill' },
              first_name: { value: 'Hela', status: 'suggest' },
            },
          },
        },
      },
    });
    const store = buildStore();

    const pending = store.dispatch(analyzeProfileVideo({ file: clip(), uiLocale: 'fr' }));
    expect(store.getState().onboarding.videoAnalysis!.status).toBe('running');
    await vi.runAllTimersAsync();
    await pending;

    const [url, form] = vi.mocked(api.post).mock.calls[0] as [string, FormData];
    expect(url).toBe('/onboarding/video-analysis');
    expect(form.get('uiLocale')).toBe('fr');
    expect(form.get('video')).toBeInstanceOf(File);
    expect(api.get).toHaveBeenCalledWith('/onboarding/video-analysis/job-1', {
      params: { token: 't0k3n' },
    });
    expect(store.getState().onboarding.videoAnalysis!).toMatchObject({
      status: 'succeeded',
      suggestions: { job: 'Aide ménagère' },
    });
  });

  it('ends in failed when the worker could not analyse the video', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        job: {
          id: 'job-2',
          status: 'SUCCEEDED',
          error: null,
          result: { ok: false, error: 'NO_SPEECH_DETECTED' },
        },
        token: 't0k3n',
      },
    });
    const store = buildStore();

    await store.dispatch(analyzeProfileVideo({ file: clip(), uiLocale: 'ar' }));

    expect(store.getState().onboarding.videoAnalysis!).toMatchObject({
      status: 'failed',
      error: 'NO_SPEECH_DETECTED',
    });
  });

  it('ignores a late answer after the video was removed', async () => {
    let answer: (value: unknown) => void = () => undefined;
    vi.mocked(api.post).mockReturnValue(new Promise((resolve) => (answer = resolve)) as never);
    const store = buildStore();

    const pending = store.dispatch(analyzeProfileVideo({ file: clip(), uiLocale: 'fr' }));
    store.dispatch(clearVideoAnalysis());
    answer({
      data: {
        job: {
          id: 'job-3',
          status: 'SUCCEEDED',
          error: null,
          result: { ok: true, profile: { city: { value: 'Sousse', status: 'fill' } } },
        },
        token: 't0k3n',
      },
    });
    await pending;

    expect(store.getState().onboarding.videoAnalysis!.status).toBe('idle');
    expect(store.getState().onboarding.videoAnalysis!.suggestions).toBeNull();
  });

  it('switches the page language with the dictionaries, then gives the first language back', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        data: {
          job: {
            id: 'job-4',
            status: 'SUCCEEDED',
            error: null,
            result: {
              ok: true,
              profile: {
                profession: {
                  value: 'menage.aide_menagere',
                  label: 'معينة منزلية',
                  status: 'fill',
                },
                city: { value: 'سوسة', status: 'fill' },
                sector_id: { value: 2, status: 'fill' },
              },
            },
          },
          token: 't0k3n',
        },
      })
      .mockResolvedValueOnce({
        data: {
          fields: {
            profession: { value: 'Aide ménagère', review: false },
            city: { value: 'Sousse', review: false },
          },
        },
      });
    const store = buildStore();
    await store.dispatch(analyzeProfileVideo({ file: clip(), uiLocale: 'ar' }));
    const arabic = store.getState().onboarding.videoAnalysis!.suggestions;

    await store.dispatch(relabelVideoAnalysis('fr'));

    expect(vi.mocked(api.post).mock.calls[1]).toEqual([
      '/onboarding/relabel',
      {
        values: { profession: 'معينة منزلية', city: 'سوسة' },
        uiLocale: 'fr',
        serviceId: 'menage.aide_menagere',
        aiFields: ['profession', 'city'],
        suggestions: {},
      },
    ]);
    expect(store.getState().onboarding.videoAnalysis!).toMatchObject({
      locale: 'fr',
      suggestions: { job: 'Aide ménagère', city: 'Sousse', industry: arabic?.industry },
    });

    await store.dispatch(relabelVideoAnalysis('ar'));

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(store.getState().onboarding.videoAnalysis!.suggestions).toEqual(arabic);
  });

  it('drops the AI values in the wrong alphabet when the language switch fails', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        data: {
          job: {
            id: 'job-5',
            status: 'SUCCEEDED',
            error: null,
            result: {
              ok: true,
              profile: {
                first_name: { value: 'مهدي', status: 'fill' },
                price: { value: '50', status: 'fill' },
              },
            },
          },
          token: 't0k3n',
        },
      })
      .mockRejectedValueOnce(new Error('Network Error'));
    const store = buildStore();
    await store.dispatch(analyzeProfileVideo({ file: clip(), uiLocale: 'ar' }));

    await store.dispatch(relabelVideoAnalysis('fr'));

    expect(store.getState().onboarding.videoAnalysis!).toMatchObject({
      locale: 'fr',
      suggestions: { price: '50' },
    });
    expect(store.getState().onboarding.videoAnalysis!.suggestions!.firstName).toBeUndefined();
  });
});
