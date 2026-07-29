import { FastifyPluginAsync, FastifyRequest } from 'fastify';

import {
  completeOnboardingSchema,
  getLoggedUserDataSchema,
  getOnboardingProfileSchema,
  updateOnboardingProfileSchema,
} from '../../../schemas/v1/index.js';
import { OnboardingService } from '../../../services/onboarding.js';
import { UsersService } from '../../../services/users.js';
import { UpdateOnboardingProfileBody } from '../../../types/onboarding.js';

const ERROR_STATUS: Record<string, 'badRequest'> = {
  onboarding_incomplete: 'badRequest',
};

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma, httpErrors } = fastify;
  const usersService = new UsersService({ prisma });
  const onboardingService = new OnboardingService({ prisma });

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
        return reply.code(200).send(data);
      } catch (err) {
        throw mapError(err as Error, request);
      }
    },
  );
};
export default routes;
