import { FastifyPluginAsync, FastifyRequest } from 'fastify';

import { PROFILE_PHOTO_RATE_LIMIT, PROFILE_VIDEO_RATE_LIMIT } from '../../../constants.js';
import {
  completeOnboardingSchema,
  deleteProfilePhotoSchema,
  deleteProfileVideoSchema,
  getLoggedUserDataSchema,
  getOnboardingProfileSchema,
  updateOnboardingProfileSchema,
  uploadProfilePhotoSchema,
  uploadProfileVideoSchema,
} from '../../../schemas/v1/index.js';
import { OnboardingService } from '../../../services/onboarding.js';
import { ProfileService } from '../../../services/profile.js';
import { UsersService } from '../../../services/users.js';
import { UpdateOnboardingProfileBody } from '../../../types/onboarding.js';
import { UploadProfilePhotoBody, UploadProfileVideoBody } from '../../../types/profile.js';
import { badRequest } from '../../../utils/http-errors.js';

const ERROR_STATUS: Record<string, 'badRequest'> = {
  onboarding_incomplete: 'badRequest',
  foreign_photo_path: 'badRequest',
};

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma, httpErrors } = fastify;
  const usersService = new UsersService({ prisma });
  const onboardingService = new OnboardingService({ prisma });
  const profileService = new ProfileService({ prisma });

  function mapError(err: Error, request: FastifyRequest) {
    const kind = ERROR_STATUS[err.message];

    if (!kind) {
      const mapped = httpErrors.internalServerError(
        request.t('internal_error', { defaultValue: 'An unexpected error occurred' }),
      );
      mapped.code = 'internal_error';
      return mapped;
    }

    const mapped = httpErrors[kind](request.t(err.message, { defaultValue: err.message }));
    mapped.code = err.message;
    return mapped;
  }

  fastify.get(
    '/me',
    {
      schema: getLoggedUserDataSchema,
    },
    async (request, reply) => {
      try {
        const data = await usersService.getLoggedUserData(request.loggedUser.id);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get(
    '/me/profile',
    {
      schema: getOnboardingProfileSchema,
    },
    async (request, reply) => {
      try {
        const data = await onboardingService.getProfile({ userId: request.loggedUser.id });
        reply.header('Cache-Control', 'private, no-store');
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.patch<{ Body: UpdateOnboardingProfileBody }>(
    '/me/profile',
    {
      schema: updateOnboardingProfileSchema,
    },
    async (request, reply) => {
      try {
        const data = await onboardingService.updateProfile({
          userId: request.loggedUser.id,
          ...request.body,
        });
        reply.header('Cache-Control', 'private, no-store');
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post(
    '/me/profile/complete',
    {
      schema: completeOnboardingSchema,
    },
    async (request, reply) => {
      try {
        const data = await onboardingService.completeOnboarding({ userId: request.loggedUser.id });
        reply.header('Cache-Control', 'private, no-store');
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );

  fastify.post<{ Body: UploadProfilePhotoBody }>(
    '/me/profile/photo',
    {
      schema: uploadProfilePhotoSchema,
      config: { rateLimit: PROFILE_PHOTO_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const photo = request.body?.photo;
        if (!photo) throw badRequest('photo is required', 'photo_required');

        const data = await profileService.uploadPhoto(request.loggedUser.id, {
          buffer: await photo.toBuffer(),
          filename: photo.filename,
          mimetype: photo.mimetype,
        });
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.delete(
    '/me/profile/photo',
    {
      schema: deleteProfilePhotoSchema,
    },
    async (request, reply) => {
      try {
        const data = await profileService.deletePhoto(request.loggedUser.id);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Body: UploadProfileVideoBody }>(
    '/me/profile/video',
    {
      schema: uploadProfileVideoSchema,
      config: { rateLimit: PROFILE_VIDEO_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const video = request.body?.video;
        if (!video) throw badRequest('video is required', 'video_required');

        const data = await profileService.uploadVideo(request.loggedUser.id, {
          buffer: await video.toBuffer(),
          filename: video.filename,
          mimetype: video.mimetype,
        });
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.delete(
    '/me/profile/video',
    {
      schema: deleteProfileVideoSchema,
    },
    async (request, reply) => {
      try {
        const data = await profileService.deleteVideo(request.loggedUser.id);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );
};
export default routes;
