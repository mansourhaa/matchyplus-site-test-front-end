import { afterEach, describe, expect, it, vi } from 'vitest';

import { VideoAnalysisService } from './video-analysis.js';

const storage = vi.hoisted(() => ({
  saveMediaFile: vi.fn(),
  deleteMediaFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('../utils/media-storage.js', () => ({
  ONBOARDING_CLIPS_DIR: '/uploads/onboarding-clips',
  saveMediaFile: storage.saveMediaFile,
  deleteMediaFile: storage.deleteMediaFile,
}));

vi.mock('node:fs/promises', () => ({
  readdir: storage.readdir,
  stat: storage.stat,
}));

const MP4_BYTES = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x00, 0x00, 0x00, 0x00,
]);
const clip = { buffer: MP4_BYTES, filename: 'clip.mp4', mimetype: 'video/mp4' };

function createService() {
  const prisma = { aiJob: { findUnique: vi.fn() } };
  const aiJobs = { createJob: vi.fn() };
  const service = new VideoAnalysisService({ prisma: prisma as never, aiJobs: aiJobs as never });
  return { service, prisma, aiJobs };
}

describe('VideoAnalysisService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startFromClip', () => {
    it('rejects a file that is not a video, without saving or queueing anything', async () => {
      const { service, aiJobs } = createService();
      storage.readdir.mockResolvedValue([]);

      await expect(
        service.startFromClip({
          buffer: Buffer.from('hello'),
          filename: 'a.txt',
          mimetype: 'text/plain',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(storage.saveMediaFile).not.toHaveBeenCalled();
      expect(aiJobs.createJob).not.toHaveBeenCalled();
    });

    it('queues an anonymous ANALYZE_VIDEO on a private clip that the worker deletes', async () => {
      const { service, aiJobs } = createService();
      storage.readdir.mockResolvedValue([]);
      storage.saveMediaFile.mockResolvedValue('abc.mp4');
      aiJobs.createJob.mockResolvedValue({ id: 'job-1', status: 'QUEUED' });

      const { job, token } = await service.startFromClip(clip, 'ar');

      expect(job).toMatchObject({ id: 'job-1' });
      expect(token).toMatch(/^[0-9a-f]{48}$/);
      expect(aiJobs.createJob).toHaveBeenCalledWith(null, {
        type: 'ANALYZE_VIDEO',
        payload: {
          mediaPath: 'onboarding-clips/abc.mp4',
          uiLocale: 'ar',
          deleteAfter: true,
          accessToken: token,
        },
      });
    });

    it('accepts the sound-only track sent by the recorder', async () => {
      const { service, aiJobs } = createService();
      storage.readdir.mockResolvedValue([]);
      storage.saveMediaFile.mockResolvedValue('abc.webm');
      aiJobs.createJob.mockResolvedValue({ id: 'job-1' });

      await service.startFromClip({
        buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]),
        filename: 'clip-audio.webm',
        mimetype: 'audio/webm',
      });

      expect(storage.saveMediaFile).toHaveBeenCalledWith(
        '/uploads/onboarding-clips',
        expect.any(Buffer),
        '.webm',
      );
      expect(aiJobs.createJob.mock.calls[0][1].payload.mediaPath).toBe('onboarding-clips/abc.webm');
    });

    it('removes the saved clip when the job can not be queued', async () => {
      const { service, aiJobs } = createService();
      storage.readdir.mockResolvedValue([]);
      storage.saveMediaFile.mockResolvedValue('abc.mp4');
      const queueDown = Object.assign(new Error('AI queue unavailable'), { statusCode: 503 });
      aiJobs.createJob.mockRejectedValue(queueDown);

      await expect(service.startFromClip(clip)).rejects.toBe(queueDown);
      expect(storage.deleteMediaFile).toHaveBeenCalledWith('/uploads/onboarding-clips', 'abc.mp4');
    });

    it('sweeps clips older than an hour, and keeps recent ones', async () => {
      const { service, aiJobs } = createService();
      storage.readdir.mockResolvedValue(['old.webm', 'new.webm']);
      storage.stat.mockImplementation((path: string) =>
        Promise.resolve({
          mtimeMs: path.endsWith('old.webm') ? Date.now() - 2 * 60 * 60 * 1000 : Date.now(),
        }),
      );
      storage.saveMediaFile.mockResolvedValue('abc.mp4');
      aiJobs.createJob.mockResolvedValue({ id: 'job-1' });

      await service.startFromClip(clip);

      expect(storage.deleteMediaFile).toHaveBeenCalledTimes(1);
      expect(storage.deleteMediaFile).toHaveBeenCalledWith('/uploads/onboarding-clips', 'old.webm');
    });
  });

  describe('getClipStatus', () => {
    const job = {
      id: 'job-1',
      type: 'ANALYZE_VIDEO',
      userId: null,
      payload: { accessToken: 'a'.repeat(48) },
    };

    it('returns the job when the token matches', async () => {
      const { service, prisma } = createService();
      prisma.aiJob.findUnique.mockResolvedValue(job);

      await expect(service.getClipStatus('job-1', 'a'.repeat(48))).resolves.toBe(job);
    });

    it('returns null for a wrong token', async () => {
      const { service, prisma } = createService();
      prisma.aiJob.findUnique.mockResolvedValue(job);

      await expect(service.getClipStatus('job-1', 'b'.repeat(48))).resolves.toBeNull();
    });

    it("never exposes a member's job or another job type", async () => {
      const { service, prisma } = createService();
      prisma.aiJob.findUnique.mockResolvedValueOnce({ ...job, userId: 'user-1' });
      await expect(service.getClipStatus('job-1', 'a'.repeat(48))).resolves.toBeNull();

      prisma.aiJob.findUnique.mockResolvedValueOnce({ ...job, type: 'VERIFY_IDENTITY' });
      await expect(service.getClipStatus('job-1', 'a'.repeat(48))).resolves.toBeNull();
    });
  });
});
