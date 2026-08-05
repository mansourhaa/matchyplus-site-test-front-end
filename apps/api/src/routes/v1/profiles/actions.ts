import { FastifyPluginAsync } from 'fastify';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  PROFILE_PHOTO_CONTENT_TYPES,
  PROFILE_VIDEO_CONTENT_TYPES,
  PROFILE_VIEW_NOTIFICATION_COOLDOWN_MS,
  PROFILE_VIEW_RATE_LIMIT,
} from '../../../constants.js';
import {
  getProfilePhotoFileSchema,
  getProfileVideoFileSchema,
  getPublicProfileSchema,
  notifyProfileViewSchema,
  rateProfileSchema,
} from '../../../schemas/v1/index.js';
import { NotificationService } from '../../../services/notification.js';
import { ProfileService } from '../../../services/profile.js';
import { RatingService } from '../../../services/rating.js';
import { ProfileIdParams, ProfileMediaFilenameParams } from '../../../types/profile.js';
import { RateProfileBody } from '../../../types/rating.js';
import { badRequest, forbidden, notFound } from '../../../utils/http-errors.js';
import { assertSafeFilename, extensionOf, parseRange } from '../../../utils/media-http.js';
import { PHOTOS_DIR, VIDEOS_DIR } from '../../../utils/media-storage.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const { prisma } = fastify;
  const profileService = new ProfileService({ prisma });
  const ratingService = new RatingService({ prisma });
  const notifications = new NotificationService({
    prisma,
    push: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  fastify.get<{ Params: ProfileIdParams }>(
    '/:id',
    { schema: getPublicProfileSchema },
    async (request, reply) => {
      try {
        const data = await profileService.getPublicProfile(
          request.loggedUser.id,
          request.params.id,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: ProfileIdParams; Body: RateProfileBody }>(
    '/:id/rating',
    { schema: rateProfileSchema },
    async (request, reply) => {
      try {
        const data = await ratingService.rate(
          request.loggedUser.id,
          request.params.id,
          request.body.rating,
        );
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: ProfileIdParams }>(
    '/:id/view',
    { schema: notifyProfileViewSchema, config: { rateLimit: PROFILE_VIEW_RATE_LIMIT } },
    async (request, reply) => {
      try {
        const info = await profileService.getViewNotificationInfo(
          request.loggedUser.id,
          request.params.id,
        );
        let notified = false;
        if (info) {
          const result = await notifications.createIfNoRecentDuplicate(
            { userId: request.params.id, type: 'PROFILE_VIEW', data: info },
            PROFILE_VIEW_NOTIFICATION_COOLDOWN_MS,
          );
          notified = result.created;
        }
        return reply.code(200).send({ notified });
      } catch (err) {
        throw err;
      }
    },
  );

  // Photos are shown as part of any profile a member can already view — no extra
  // relationship check, matching legacy (only video is access-gated there).
  fastify.get<{ Params: ProfileMediaFilenameParams }>(
    '/media/photos/:filename',
    { schema: getProfilePhotoFileSchema },
    async (request, reply) => {
      try {
        const { filename } = request.params;
        assertSafeFilename(filename);
        const contentType = PROFILE_PHOTO_CONTENT_TYPES[extensionOf(filename)];
        if (!contentType) throw badRequest('invalid filename', 'invalid_filename');

        const owner = await prisma.user.findFirst({
          where: { image: `/uploads/photos/${filename}` },
          select: { id: true },
        });
        if (!owner) throw notFound('photo not found', 'photo_not_found');
        await profileService.assertCanViewProfile(request.loggedUser.id, owner.id);

        const filePath = join(PHOTOS_DIR, filename);
        if (!existsSync(filePath)) {
          throw notFound('photo not found', 'photo_not_found');
        }

        reply.header('Content-Type', contentType);
        reply.header('Cache-Control', 'private, max-age=86400');
        return reply.send(createReadStream(filePath));
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get<{ Params: ProfileMediaFilenameParams }>(
    '/media/videos/:filename',
    { schema: getProfileVideoFileSchema },
    async (request, reply) => {
      try {
        const { filename } = request.params;
        assertSafeFilename(filename);
        const contentType = PROFILE_VIDEO_CONTENT_TYPES[extensionOf(filename)];
        if (!contentType) throw badRequest('invalid filename', 'invalid_filename');

        const owner = await prisma.user.findFirst({
          where: { video: `/uploads/videos/${filename}` },
          select: { id: true },
        });
        if (!owner) {
          throw notFound('video not found', 'video_not_found');
        }

        const allowed = await profileService.canAccessVideo(request.loggedUser.id, owner.id);
        if (!allowed) {
          throw forbidden('video access denied', 'video_access_denied');
        }

        const filePath = join(VIDEOS_DIR, filename);
        if (!existsSync(filePath)) {
          throw notFound('video not found', 'video_not_found');
        }

        const size = statSync(filePath).size;
        const range = parseRange(request.headers.range, size);
        reply.header('Content-Type', contentType);
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Cache-Control', 'private, no-store');
        if (!range) {
          reply.header('Content-Length', size);
          return reply.send(createReadStream(filePath));
        }

        reply.code(206);
        reply.header('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
        reply.header('Content-Length', range.end - range.start + 1);
        return reply.send(createReadStream(filePath, range));
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
