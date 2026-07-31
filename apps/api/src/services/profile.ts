import { Prisma, PrismaClient } from '@saas-boilerplate/types';

import {
  ALLOWED_PROFILE_PHOTO_MIMES,
  ALLOWED_PROFILE_VIDEO_MIMES,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_VIDEO_MAX_BYTES,
} from '../constants.js';
import { AbstractServiceOptions } from '../types/services.js';
import { badRequest, forbidden, notFound } from '../utils/http-errors.js';
import { orderedUserPair } from '../utils/match-pair.js';
import {
  PHOTOS_DIR,
  VIDEOS_DIR,
  deleteMediaFile,
  filenameFromStoredPath,
  isStoredMediaPath,
  saveMediaFile,
} from '../utils/media-storage.js';
import { validateUploadedFile } from '../utils/media-validation.js';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  job: true,
  bio: true,
  image: true,
  video: true,
  city: true,
  interests: true,
  languages: true,
  contact_modes: true,
  availability_days: true,
  availability_hours: true,
  offer_service: true,
  service_type: true,
  price: true,
  profile_type: true,
  experience: true,
  activity_sector: true,
  looking_for: true,
  selected_goals: true,
  rating: true,
  reviews: true,
  status: true,
} satisfies Prisma.UserSelect;

type UploadedFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
};

function toPublicProfileResult(
  user: Prisma.UserGetPayload<{ select: typeof PUBLIC_PROFILE_SELECT }>,
) {
  const { status: _status, rating, reviews, ...rest } = user;
  return {
    ...rest,
    rating: rating > 0 ? rating : null,
    reviews: reviews > 0 ? reviews : null,
  };
}

export class ProfileService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  private async assertNotBlocked(a: string, b: string): Promise<void> {
    try {
      const block = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blocker_id: a, blocked_id: b },
            { blocker_id: b, blocked_id: a },
          ],
        },
        select: { id: true },
      });
      if (block) throw forbidden('interaction blocked with this user', 'blocked');
    } catch (err) {
      throw err;
    }
  }

  /**
   * Any authenticated, ACTIVE user may view any other user's profile by id — matching
   * matchy-plus-legacy's actual (if confusingly-named) "public" profile behavior, which
   * really means "viewable by any signed-in member via link/QR", not anonymous-public.
   * Unlike legacy, a blocked relationship is checked (legacy's getPublicProfile has none).
   *
   * `matched` is computed here (rather than left for the client to infer from its own
   * matches list) so that a profile opened directly — a shared link, a QR code, a
   * notification — reports the real relationship immediately, without depending on
   * whatever match data the client happens to already have loaded.
   */
  async getPublicProfile(viewerId: string, targetUserId: string) {
    try {
      if (viewerId !== targetUserId) {
        await this.assertNotBlocked(viewerId, targetUserId);
      }

      const user = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: PUBLIC_PROFILE_SELECT,
      });

      if (!user || user.status !== 'ACTIVE') {
        throw notFound('profile not found', 'profile_not_found');
      }

      const result = toPublicProfileResult(user);
      const matched = viewerId !== targetUserId && (await this.hasMatch(viewerId, targetUserId));
      if (result.video && !(viewerId === targetUserId || matched)) {
        result.video = null;
      }
      return { ...result, matched };
    } catch (err) {
      throw err;
    }
  }

  async assertCanViewProfile(viewerId: string, ownerId: string): Promise<void> {
    try {
      if (viewerId !== ownerId) {
        await this.assertNotBlocked(viewerId, ownerId);
      }

      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { status: true },
      });

      if (!owner || owner.status !== 'ACTIVE') {
        throw notFound('profile not found', 'profile_not_found');
      }
    } catch (err) {
      throw err;
    }
  }

  private async hasMatch(a: string, b: string): Promise<boolean> {
    try {
      const pair = orderedUserPair(a, b);
      const match = await this.prisma.match.findUnique({
        where: {
          user_low_id_user_high_id: { user_low_id: pair.userLowId, user_high_id: pair.userHighId },
        },
        select: { id: true },
      });
      return Boolean(match);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Owner, an active match, or the viewer being the owner may stream the profile video —
   * matching legacy's canAccessProfileVideo (minus its "active conversation" branch,
   * since no conversation/message model exists in this schema yet).
   */
  async canAccessVideo(viewerId: string, ownerId: string): Promise<boolean> {
    try {
      if (viewerId === ownerId) return true;
      return await this.hasMatch(viewerId, ownerId);
    } catch (err) {
      throw err;
    }
  }

  async uploadPhoto(userId: string, file: UploadedFile) {
    try {
      if (file.buffer.byteLength > PROFILE_PHOTO_MAX_BYTES) {
        throw badRequest('photo exceeds the 8MB limit', 'photo_too_large');
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

      const existing = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { image: true },
      });
      const savedFilename = await saveMediaFile(PHOTOS_DIR, file.buffer, validation.ext);
      const image = `/uploads/photos/${savedFilename}`;
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { image } });
      } catch (error) {
        await deleteMediaFile(PHOTOS_DIR, savedFilename);
        throw error;
      }

      if (isStoredMediaPath(existing.image, 'photos')) {
        await deleteMediaFile(PHOTOS_DIR, filenameFromStoredPath(existing.image));
      }
      return { image };
    } catch (err) {
      throw err;
    }
  }

  async deletePhoto(userId: string) {
    try {
      const existing = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { image: true },
      });
      await this.prisma.user.update({ where: { id: userId }, data: { image: null } });
      if (isStoredMediaPath(existing.image, 'photos')) {
        await deleteMediaFile(PHOTOS_DIR, filenameFromStoredPath(existing.image));
      }
      return { image: null };
    } catch (err) {
      throw err;
    }
  }

  async uploadVideo(userId: string, file: UploadedFile) {
    try {
      if (file.buffer.byteLength > PROFILE_VIDEO_MAX_BYTES) {
        throw badRequest('video exceeds the 50MB limit', 'video_too_large');
      }

      const validation = validateUploadedFile({
        buffer: file.buffer,
        originalname: file.filename,
        mimetype: file.mimetype,
        allowedMimes: ALLOWED_PROFILE_VIDEO_MIMES,
      });
      if (!validation.ok) {
        throw badRequest(validation.error, validation.error);
      }

      const existing = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { video: true },
      });
      const savedFilename = await saveMediaFile(VIDEOS_DIR, file.buffer, validation.ext);
      const video = `/uploads/videos/${savedFilename}`;
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { video } });
      } catch (error) {
        await deleteMediaFile(VIDEOS_DIR, savedFilename);
        throw error;
      }

      if (isStoredMediaPath(existing.video, 'videos')) {
        await deleteMediaFile(VIDEOS_DIR, filenameFromStoredPath(existing.video));
      }
      return { video };
    } catch (err) {
      throw err;
    }
  }

  async deleteVideo(userId: string) {
    try {
      const existing = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { video: true },
      });
      await this.prisma.user.update({ where: { id: userId }, data: { video: null } });
      if (isStoredMediaPath(existing.video, 'videos')) {
        await deleteMediaFile(VIDEOS_DIR, filenameFromStoredPath(existing.video));
      }
      return { video: null };
    } catch (err) {
      throw err;
    }
  }
}
