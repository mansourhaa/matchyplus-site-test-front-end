import { Prisma, PrismaClient } from '@saas-boilerplate/types';

import {
  ALLOWED_PROFILE_PHOTO_MIMES,
  ALLOWED_PROFILE_VIDEO_MIMES,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_VIDEO_MAX_BYTES,
} from '../constants.js';
import { AbstractServiceOptions } from '../types/services.js';
import { parseLatLon } from '../utils/geo-coords.js';
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
import { GeolocationService } from './geolocation.js';

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
  geolocation: GeolocationService;

  constructor(options: AbstractServiceOptions & { geolocation?: GeolocationService }) {
    this.prisma = options.prisma;
    this.geolocation = options.geolocation ?? new GeolocationService();
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

      // Told to the client for the same reason as `matched`: reopening a profile the
      // viewer already rated should show that state immediately, not the rating picker
      // flashing until a submit attempt bounces off with already_rated.
      const viewerHasRated =
        viewerId !== targetUserId &&
        Boolean(
          await this.prisma.rating.findUnique({
            where: { rater_id_ratee_id: { rater_id: viewerId, ratee_id: targetUserId } },
            select: { id: true },
          }),
        );

      return { ...result, matched, viewer_has_rated: viewerHasRated };
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
   * Owner, an active match, or an existing conversation (post-unmatch history) may
   * stream the profile video — matching legacy canAccessProfileVideo.
   */
  async canAccessVideo(viewerId: string, ownerId: string): Promise<boolean> {
    try {
      if (viewerId === ownerId) return true;
      if (await this.hasMatch(viewerId, ownerId)) return true;

      // Post-unmatch: allow video if a conversation thread still exists for history.
      const pair = orderedUserPair(viewerId, ownerId);
      const conversation = await this.prisma.conversation.findUnique({
        where: {
          user_low_id_user_high_id: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        },
        select: { id: true },
      });
      return Boolean(conversation);
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

  /**
   * Saves the member's real coordinates and, when reverse geocoding succeeds, updates their
   * `city` from them — the only path that keeps `city` connected to where the member actually
   * is, since onboarding only ever collects it as an optional, one-off free-text field.
   * Reverse-geocode failures are not fatal: coordinates are still saved, `city` is just left
   * untouched rather than overwritten with a bad value.
   */
  async syncLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ city: string | null }> {
    const coords = parseLatLon(latitude, longitude);
    if (!coords) {
      throw badRequest('invalid latitude or longitude', 'invalid_coordinates');
    }

    const reverse = await this.geolocation.reverseGeocode(coords.lat, coords.lon);
    const city = reverse.success ? reverse.city : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        gps_latitude: coords.lat,
        gps_longitude: coords.lon,
        ...(city ? { city } : {}),
      },
    });

    return { city };
  }

  /**
   * Resolves who should be told about a profile view, or `null` when there's nothing to
   * tell (viewing your own profile). Validates the same visibility rules as
   * `getPublicProfile` so a blocked or unknown profile can't be used to probe for a
   * notification side effect. The viewer's name is trimmed to a first name and prefers
   * that safe fallback for a blank one, since this is only ever shown as a quick
   * "someone viewed you" hint, never a full identity reveal.
   */
  async getViewNotificationInfo(
    viewerId: string,
    targetId: string,
  ): Promise<{ viewerId: string; viewerName: string; viewerImage: string | null } | null> {
    try {
      if (viewerId === targetId) return null;
      await this.assertCanViewProfile(viewerId, targetId);

      const viewer = await this.prisma.user.findUniqueOrThrow({
        where: { id: viewerId },
        select: { name: true, image: true },
      });
      const viewerName = viewer.name.trim().split(/\s+/)[0] || "Quelqu'un";
      return { viewerId, viewerName, viewerImage: viewer.image };
    } catch (err) {
      throw err;
    }
  }
}
