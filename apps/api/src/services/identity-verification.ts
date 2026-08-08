import { AiJob, PrismaClient } from '@saas-boilerplate/types';

import { ALLOWED_PROFILE_PHOTO_MIMES, PROFILE_PHOTO_MAX_BYTES } from '../constants.js';
import { badRequest } from '../utils/http-errors.js';
import {
  IDENTITY_DIR,
  deleteMediaFile,
  filenameFromStoredPath,
  isStoredMediaPath,
  saveMediaFile,
} from '../utils/media-storage.js';
import { validateUploadedFile } from '../utils/media-validation.js';
import { AiJobsService } from './ai-jobs.js';

type UploadedFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
};

export type IdentityVerificationServiceDeps = {
  prisma: PrismaClient;
  aiJobs: AiJobsService;
};

export class IdentityVerificationService {
  constructor(private readonly deps: IdentityVerificationServiceDeps) {}

  /**
   * Saves the selfie, then enqueues a VERIFY_IDENTITY job carrying only paths relative
   * to the shared uploads root — the Flask worker resolves those against its own
   * AI_UPLOADS_DIR mount (see compose.dev.yaml), never raw bytes through Redis/Postgres.
   */
  async submitSelfie(userId: string, file: UploadedFile): Promise<AiJob> {
    try {
      if (file.buffer.byteLength > PROFILE_PHOTO_MAX_BYTES) {
        throw badRequest('selfie exceeds the 8MB limit', 'selfie_too_large');
      }

      const validation = validateUploadedFile({
        buffer: file.buffer,
        originalname: file.filename,
        mimetype: file.mimetype,
        allowedMimes: ALLOWED_PROFILE_PHOTO_MIMES,
      });
      if (!validation.ok) {
        throw badRequest(validation.error, validation.error);
      }

      const user = await this.deps.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { image: true },
      });
      // Comparing against a legacy base64 data URL or a missing photo isn't
      // meaningful — a real uploaded profile photo is required first.
      if (!isStoredMediaPath(user.image, 'photos')) {
        throw badRequest(
          'a profile photo is required before identity verification',
          'profile_photo_required',
        );
      }

      const selfieFilename = await saveMediaFile(IDENTITY_DIR, file.buffer, validation.ext);
      try {
        return await this.deps.aiJobs.createJob(userId, {
          type: 'VERIFY_IDENTITY',
          payload: {
            selfiePath: `identity/${selfieFilename}`,
            profilePhotoPath: `photos/${filenameFromStoredPath(user.image as string)}`,
          },
        });
      } catch (error) {
        await deleteMediaFile(IDENTITY_DIR, selfieFilename);
        throw error;
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Idempotently syncs User.verified from a terminal job's result — safe to
   * call on every poll, since it's a plain overwrite from the same source of truth.
   */
  async getStatus(
    userId: string,
    jobId: string,
  ): Promise<{ job: AiJob; identityVerified: boolean } | null> {
    try {
      const job = await this.deps.aiJobs.getJobForUser(jobId, userId);
      if (!job) return null;

      const result = job.result as Record<string, unknown> | null;
      if (job.status === 'SUCCEEDED' && result && typeof result.verified === 'boolean') {
        const updated = await this.deps.prisma.user.update({
          where: { id: userId },
          data: { verified: result.verified },
          select: { verified: true },
        });
        return { job, identityVerified: updated.verified };
      }

      const user = await this.deps.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { verified: true },
      });
      return { job, identityVerified: user.verified };
    } catch (err) {
      throw err;
    }
  }
}
