import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { AiJob, PrismaClient } from '@saas-boilerplate/types';

import {
  ALLOWED_PROFILE_VIDEO_MIMES,
  ALLOWED_VOICE_AUDIO_MIMES,
  ONBOARDING_CLIP_MAX_AGE_MS,
  PROFILE_VIDEO_MAX_BYTES,
} from '../constants.js';
import { VideoAnalysisLocale } from '../types/video-analysis.js';
import { badRequest } from '../utils/http-errors.js';
import { ONBOARDING_CLIPS_DIR, deleteMediaFile, saveMediaFile } from '../utils/media-storage.js';
import { validateUploadedFile } from '../utils/media-validation.js';
import { AiJobsService } from './ai-jobs.js';

export type { VideoAnalysisLocale };

export type VideoAnalysisServiceDeps = {
  prisma: PrismaClient;
  aiJobs: AiJobsService;
};

export type OnboardingClip = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
};

function sameToken(expected: unknown, presented: string): boolean {
  if (typeof expected !== 'string' || !presented) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Pre-fills the onboarding form from the video the visitor just recorded, before the SMS
 * check — so no account exists yet. The clip is stored privately (never served), only its
 * path relative to the shared uploads root travels through Redis/Postgres, and the worker
 * deletes it once analysed (`deleteAfter`). The profile video itself is still uploaded
 * after the OTP, as before. Reading the result needs the random token returned here, so
 * a job id alone never exposes someone else's transcript.
 */
export class VideoAnalysisService {
  constructor(private readonly deps: VideoAnalysisServiceDeps) {}

  async startFromClip(
    clip: OnboardingClip,
    uiLocale: VideoAnalysisLocale = 'fr',
  ): Promise<{ job: AiJob; token: string }> {
    try {
      if (clip.buffer.byteLength > PROFILE_VIDEO_MAX_BYTES) {
        throw badRequest('video exceeds the 50MB limit', 'video_too_large');
      }
      const validation = validateUploadedFile({
        buffer: clip.buffer,
        originalname: clip.filename,
        mimetype: clip.mimetype,
        // The recorder sends the sound-only track when it has one, else the video.
        allowedMimes: [...ALLOWED_PROFILE_VIDEO_MIMES, ...ALLOWED_VOICE_AUDIO_MIMES],
      });
      if (!validation.ok) {
        throw badRequest(validation.error, validation.error);
      }

      await this.sweepStaleClips();

      const savedFilename = await saveMediaFile(ONBOARDING_CLIPS_DIR, clip.buffer, validation.ext);
      const token = randomBytes(24).toString('hex');
      try {
        const job = await this.deps.aiJobs.createJob(null, {
          type: 'ANALYZE_VIDEO',
          payload: {
            mediaPath: `onboarding-clips/${savedFilename}`,
            uiLocale,
            deleteAfter: true,
            accessToken: token,
          },
        });
        return { job, token };
      } catch (err) {
        await deleteMediaFile(ONBOARDING_CLIPS_DIR, savedFilename);
        throw err;
      }
    } catch (err) {
      throw err;
    }
  }

  /** The anonymous ANALYZE_VIDEO job matching this id and token, or null. */
  async getClipStatus(jobId: string, token: string): Promise<AiJob | null> {
    try {
      const job = await this.deps.prisma.aiJob.findUnique({ where: { id: jobId } });
      if (!job || job.type !== 'ANALYZE_VIDEO' || job.userId !== null) return null;
      const payload = (job.payload ?? {}) as Record<string, unknown>;
      if (!sameToken(payload.accessToken, token)) return null;
      return job;
    } catch (err) {
      throw err;
    }
  }

  /** Best effort: removes clips the worker never got to (queue down, job failed for good). */
  private async sweepStaleClips(): Promise<void> {
    try {
      const now = Date.now();
      for (const name of await readdir(ONBOARDING_CLIPS_DIR)) {
        const info = await stat(join(ONBOARDING_CLIPS_DIR, name));
        if (now - info.mtimeMs > ONBOARDING_CLIP_MAX_AGE_MS) {
          await deleteMediaFile(ONBOARDING_CLIPS_DIR, name);
        }
      }
    } catch {
      // The folder may not exist yet; a failed sweep must never block an analysis.
    }
  }
}
