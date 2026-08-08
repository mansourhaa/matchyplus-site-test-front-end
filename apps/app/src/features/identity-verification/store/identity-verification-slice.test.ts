import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import identityVerificationReducer, {
  fetchIdentityVerificationStatus,
  fetchLatestIdentityVerification,
  resetIdentityVerification,
  submitIdentitySelfie,
} from './identity-verification-slice';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  };
});

const queuedJob = {
  id: 'job-1',
  type: 'VERIFY_IDENTITY',
  status: 'QUEUED' as const,
  result: null,
  error: null,
  createdAt: '2026-08-05T10:00:00.000Z',
  updatedAt: '2026-08-05T10:00:00.000Z',
};

function buildStore() {
  return configureStore({ reducer: { identityVerification: identityVerificationReducer } });
}

describe('identity-verification-slice', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitIdentitySelfie', () => {
    it('uploads the selfie as multipart form data and stores the returned job', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { job: queuedJob } });
      const store = buildStore();
      const selfie = new Blob(['fake-image-bytes'], { type: 'image/jpeg' });

      await store.dispatch(submitIdentitySelfie(selfie));

      expect(api.post).toHaveBeenCalledWith(
        '/users/me/identity-verification',
        expect.any(FormData),
      );
      const [, form] = vi.mocked(api.post).mock.calls[0];
      expect((form as FormData).get('selfie')).toBeInstanceOf(Blob);

      const state = store.getState().identityVerification;
      expect(state.job).toEqual(queuedJob);
      expect(state.submitting).toBe(false);
      expect(state.error).toBeNull();
    });

    it('surfaces the API error code on failure (e.g. profile_photo_required)', async () => {
      vi.mocked(api.post).mockRejectedValue({
        isAxiosError: true,
        response: { data: { code: 'profile_photo_required' } },
      });
      const store = buildStore();

      await store.dispatch(submitIdentitySelfie(new Blob(['x'])));

      const state = store.getState().identityVerification;
      expect(state.submitting).toBe(false);
      expect(state.error).toBe('profile_photo_required');
    });

    it('sets submitting: true while the request is in flight', async () => {
      let resolveRequest!: (value: { data: { job: typeof queuedJob } }) => void;
      vi.mocked(api.post).mockReturnValue(
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
      );
      const store = buildStore();

      const dispatched = store.dispatch(submitIdentitySelfie(new Blob(['x'])));
      expect(store.getState().identityVerification.submitting).toBe(true);

      resolveRequest({ data: { job: queuedJob } });
      await dispatched;
      expect(store.getState().identityVerification.submitting).toBe(false);
    });
  });

  describe('fetchIdentityVerificationStatus', () => {
    it('updates the job and identityVerified flag from GET /users/me/identity-verification/:jobId', async () => {
      const succeededJob = {
        ...queuedJob,
        status: 'SUCCEEDED' as const,
        result: { verified: true },
      };
      vi.mocked(api.get).mockResolvedValue({
        data: { job: succeededJob, identityVerified: true },
      });
      const store = buildStore();

      await store.dispatch(fetchIdentityVerificationStatus('job-1'));

      expect(api.get).toHaveBeenCalledWith('/users/me/identity-verification/job-1');
      const state = store.getState().identityVerification;
      expect(state.job).toEqual(succeededJob);
      expect(state.identityVerified).toBe(true);
      expect(state.polling).toBe(false);
    });
  });

  describe('fetchLatestIdentityVerification', () => {
    // The regression this thunk exists for: the poll loop gave up before the worker
    // finished, so nothing ever read the SUCCEEDED result. Redux state does not survive
    // the reload, so the job id is gone and only a lookup by user can recover it.
    it('recovers a job that finished after the poll loop gave up', async () => {
      const succeededJob = {
        ...queuedJob,
        status: 'SUCCEEDED' as const,
        result: { verified: true },
      };
      vi.mocked(api.get).mockResolvedValue({
        data: { job: succeededJob, identityVerified: true },
      });
      const store = buildStore();

      await store.dispatch(fetchLatestIdentityVerification());

      expect(api.get).toHaveBeenCalledWith('/users/me/identity-verification');
      const state = store.getState().identityVerification;
      expect(state.job).toEqual(succeededJob);
      expect(state.identityVerified).toBe(true);
      expect(state.restored).toBe(true);
    });

    it('restores with a null job when the user has never submitted a selfie', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { job: null, identityVerified: false } });
      const store = buildStore();

      await store.dispatch(fetchLatestIdentityVerification());

      const state = store.getState().identityVerification;
      expect(state.job).toBeNull();
      expect(state.restored).toBe(true);
    });

    it('still marks the state restored when the lookup fails, so the camera is not blocked', async () => {
      vi.mocked(api.get).mockRejectedValue({
        isAxiosError: true,
        response: { data: { code: 'internal_error' } },
      });
      const store = buildStore();

      await store.dispatch(fetchLatestIdentityVerification());

      expect(store.getState().identityVerification.restored).toBe(true);
    });
  });

  describe('resetIdentityVerification', () => {
    it('clears the job back to the initial state (used to let the user retry after a failure)', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { job: queuedJob } });
      const store = buildStore();
      await store.dispatch(submitIdentitySelfie(new Blob(['x'])));
      expect(store.getState().identityVerification.job).not.toBeNull();

      store.dispatch(resetIdentityVerification());

      expect(store.getState().identityVerification.job).toBeNull();
      expect(store.getState().identityVerification.identityVerified).toBe(false);
    });

    it('keeps `restored` so a retry shows the camera instead of the restore spinner', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { job: null, identityVerified: false } });
      const store = buildStore();
      await store.dispatch(fetchLatestIdentityVerification());

      store.dispatch(resetIdentityVerification());

      expect(store.getState().identityVerification.restored).toBe(true);
    });
  });
});
