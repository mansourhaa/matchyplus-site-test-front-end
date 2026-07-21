import { FastifyPluginAsync } from 'fastify';
import _ from 'lodash';

import {
  adminLoginSchema,
  authCheckSchema,
  loginSchema,
  registerSchema,
} from '../../../schemas/v1/index.js';
import { AuthenticationService } from '../../../services/authentication.js';
import { LoginPayload, RegisterPayload, ResetPayload } from '../../../types/auth.js';

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma } = fastify;
  const authService = new AuthenticationService({ prisma });

  /**
   * The global limit (100/min) is far too generous for credential checking, so both login
   * routes get their own budget. @fastify/rate-limit evaluates at `onRequest`, before the body
   * is parsed, so this can only be keyed per IP (the plugin default) — a per-account key is not
   * reachable here. Successful logins count towards the budget too.
   */
  const loginRateLimit = {
    rateLimit: {
      max: 10,
      timeWindow: '15 minutes',
    },
  };

  fastify.post<{ Body: LoginPayload }>(
    '/login',
    {
      schema: loginSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await authService.login(request.body);

        // Generating Token
        return reply.code(200).send({
          access_token: data.accessToken,
          user: _.omit(data.user, ['password']),
        });
      } catch (err) {
        throw err;
      }
    },
  );
  fastify.post<{ Body: LoginPayload }>(
    '/admin/login',
    {
      schema: adminLoginSchema,
      config: loginRateLimit,
    },
    async (request, reply) => {
      try {
        const data = await authService.adminLogin(request.body);

        return reply.code(200).send({
          access_token: data.accessToken,
          user: _.omit(data.user, ['password']),
        });
      } catch (err) {
        throw err;
      }
    },
  );
  fastify.post<{ Body: RegisterPayload }>(
    '/register',
    {
      schema: registerSchema,
    },
    async (request, reply) => {
      try {
        const data = await authService.register(request.body);
        return reply.code(200).send({
          message: request.t('account_created_successfully'),
          code: 'account_created_successfully',
        });
      } catch (err) {
        throw err;
      }
    },
  );
  fastify.get(
    '/authcheck',
    {
      schema: authCheckSchema,
      preHandler: [fastify.verifyToken],
    },
    async (request, reply) => {
      try {
        const data = await authService.authCheck({
          id: request.loggedUser.id,
        });
        return reply.code(200).send({ user: data });
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
