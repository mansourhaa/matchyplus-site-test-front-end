import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteMediaFile, saveMediaFile } from '../utils/media-storage.js';
import { IdentityVerificationService } from './identity-verification.js';

vi.mock('../utils/media-storage.js', () => ({
  IDENTITY_DIR: '/uploads/identity',
  saveMediaFile: vi.fn(),
  deleteMediaFile: vi.fn(),
  isStoredMediaPath: (value: string | null | undefined, kind?: string) =>
    Boolean(value) && !value?.startsWith('data:') && (!kind || value?.includes(`/${kind}/`)),
  filenameFromStoredPath: (value: string) => value.split('/').pop(),
}));

function createMockPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  };
}

function createMockAiJobs() {
  return {
    createJob: vi.fn(),
    getJobForUser: vi.fn(),
    findLatestJobForUser: vi.fn(),
  };
}

function createService() {
  const prisma = createMockPrisma();
  const aiJobs = createMockAiJobs();
  const service = new IdentityVerificationService({
    prisma: prisma as never,
    aiJobs: aiJobs as never,
  });
  return { service, prisma, aiJobs };
}

const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00]);

describe('IdentityVerificationService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitSelfie', () => {
    it('rejects a selfie over the 8MB limit without touching storage', async () => {
      const { service, aiJobs } = createService();
      const oversized = Buffer.alloc(9 * 1024 * 1024);

      await expect(
        service.submitSelfie('user-1', {
          buffer: oversized,
          filename: 'selfie.jpg',
          mimetype: 'image/jpeg',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'selfie_too_large' });
      expect(saveMediaFile).not.toHaveBeenCalled();
      expect(aiJobs.createJob).not.toHaveBeenCalled();
    });

    it('rejects an unsupported/invalid file without touching storage', async () => {
      const { service, aiJobs } = createService();
      const notAnImage = Buffer.from('not an image');

      await expect(
        service.submitSelfie('user-1', {
          buffer: notAnImage,
          filename: 'selfie.jpg',
          mimetype: 'image/jpeg',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(saveMediaFile).not.toHaveBeenCalled();
      expect(aiJobs.createJob).not.toHaveBeenCalled();
    });

    it('rejects when the user has no real uploaded profile photo yet', async () => {
      const { service, prisma, aiJobs } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ image: null });

      await expect(
        service.submitSelfie('user-1', {
          buffer: jpegBuffer,
          filename: 'selfie.jpg',
          mimetype: 'image/jpeg',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'profile_photo_required' });
      expect(saveMediaFile).not.toHaveBeenCalled();
      expect(aiJobs.createJob).not.toHaveBeenCalled();
    });

    it('rejects a legacy base64 data-URL profile photo the same way as a missing one', async () => {
      const { service, prisma } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ image: 'data:image/png;base64,abc' });

      await expect(
        service.submitSelfie('user-1', {
          buffer: jpegBuffer,
          filename: 'selfie.jpg',
          mimetype: 'image/jpeg',
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'profile_photo_required' });
    });

    it('saves the selfie and enqueues a VERIFY_IDENTITY job with paths relative to the shared uploads root', async () => {
      const { service, prisma, aiJobs } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ image: '/uploads/photos/owner.jpg' });
      vi.mocked(saveMediaFile).mockResolvedValue('new-selfie.jpg');
      const fakeJob = { id: 'job-1', status: 'QUEUED' };
      aiJobs.createJob.mockResolvedValue(fakeJob);

      const result = await service.submitSelfie('user-1', {
        buffer: jpegBuffer,
        filename: 'selfie.jpg',
        mimetype: 'image/jpeg',
      });

      expect(saveMediaFile).toHaveBeenCalledWith('/uploads/identity', jpegBuffer, '.jpg');
      expect(aiJobs.createJob).toHaveBeenCalledWith('user-1', {
        type: 'VERIFY_IDENTITY',
        payload: {
          selfiePath: 'identity/new-selfie.jpg',
          profilePhotoPath: 'photos/owner.jpg',
        },
      });
      expect(result).toBe(fakeJob);
    });

    it('deletes the saved selfie if job creation fails (e.g. the queue is unavailable)', async () => {
      const { service, prisma, aiJobs } = createService();
      prisma.user.findUniqueOrThrow.mockResolvedValue({ image: '/uploads/photos/owner.jpg' });
      vi.mocked(saveMediaFile).mockResolvedValue('new-selfie.jpg');
      aiJobs.createJob.mockRejectedValue(new Error('AI queue unavailable'));

      await expect(
        service.submitSelfie('user-1', {
          buffer: jpegBuffer,
          filename: 'selfie.jpg',
          mimetype: 'image/jpeg',
        }),
      ).rejects.toThrow('AI queue unavailable');

      expect(deleteMediaFile).toHaveBeenCalledWith('/uploads/identity', 'new-selfie.jpg');
    });
  });

  describe('getStatus', () => {
    it('returns null when the job does not exist (or does not belong to this user)', async () => {
      const { service, aiJobs } = createService();
      aiJobs.getJobForUser.mockResolvedValue(null);

      const result = await service.getStatus('user-1', 'job-1');

      expect(result).toBeNull();
    });

    it('syncs User.verified from a succeeded job result', async () => {
      const { service, prisma, aiJobs } = createService();
      const job = { id: 'job-1', status: 'SUCCEEDED', result: { verified: true } };
      aiJobs.getJobForUser.mockResolvedValue(job);
      prisma.user.update.mockResolvedValue({ verified: true });

      const result = await service.getStatus('user-1', 'job-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { verified: true },
        select: { verified: true },
      });
      expect(result).toEqual({ job, identityVerified: true });
    });

    it('syncs verified: false from a succeeded-but-not-a-match result', async () => {
      const { service, prisma, aiJobs } = createService();
      const job = { id: 'job-1', status: 'SUCCEEDED', result: { verified: false } };
      aiJobs.getJobForUser.mockResolvedValue(job);
      prisma.user.update.mockResolvedValue({ verified: false });

      const result = await service.getStatus('user-1', 'job-1');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result).toEqual({ job, identityVerified: false });
    });

    it('reports the current (unchanged) flag without writing anything while the job is still in flight', async () => {
      const { service, prisma, aiJobs } = createService();
      const job = { id: 'job-1', status: 'RUNNING', result: null };
      aiJobs.getJobForUser.mockResolvedValue(job);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ verified: false });

      const result = await service.getStatus('user-1', 'job-1');

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ job, identityVerified: false });
    });

    it('never clears an earned verification when the capture was unusable', async () => {
      // no_face_detected carries verified: false but is not a verdict about identity.
      const { service, prisma, aiJobs } = createService();
      const job = {
        id: 'job-2',
        status: 'SUCCEEDED',
        result: { verified: false, code: 'no_face_detected' },
      };
      aiJobs.getJobForUser.mockResolvedValue(job);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ verified: true });

      const result = await service.getStatus('user-1', 'job-2');

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ job, identityVerified: true });
    });

    it('does not sync from a failed job either', async () => {
      const { service, prisma, aiJobs } = createService();
      const job = { id: 'job-1', status: 'FAILED', result: null, error: 'boom' };
      aiJobs.getJobForUser.mockResolvedValue(job);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ verified: false });

      const result = await service.getStatus('user-1', 'job-1');

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ job, identityVerified: false });
    });
  });

  describe('getLatestStatus', () => {
    it('reports the stored flag with a null job when the user never submitted a selfie', async () => {
      const { service, prisma, aiJobs } = createService();
      aiJobs.findLatestJobForUser.mockResolvedValue(null);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ verified: false });

      const result = await service.getLatestStatus('user-1');

      expect(aiJobs.findLatestJobForUser).toHaveBeenCalledWith('user-1', 'VERIFY_IDENTITY');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ job: null, identityVerified: false });
    });

    it('recovers a succeeded job the client stopped polling and syncs User.verified', async () => {
      const { service, prisma, aiJobs } = createService();
      const job = { id: 'job-1', status: 'SUCCEEDED', result: { verified: true } };
      aiJobs.findLatestJobForUser.mockResolvedValue(job);
      prisma.user.update.mockResolvedValue({ verified: true });

      const result = await service.getLatestStatus('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { verified: true },
        select: { verified: true },
      });
      expect(result).toEqual({ job, identityVerified: true });
    });

    it('returns a still-running job so the UI can resume polling after a reload', async () => {
      const { service, prisma, aiJobs } = createService();
      const job = { id: 'job-1', status: 'RUNNING', result: null };
      aiJobs.findLatestJobForUser.mockResolvedValue(job);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ verified: false });

      const result = await service.getLatestStatus('user-1');

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ job, identityVerified: false });
    });
  });
});
