import { FastifyPluginAsync } from 'fastify';
import _ from 'lodash';

import {
  adminLoginSchema,
  adminLogoutSchema,
  authCheckSchema,
  loginSchema,
  registerSchema,
} from '../../../schemas/v1/index.js';
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  clearAdminSessionCookieOptions,
} from '../../../services/admin-session.js';
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

        // The panel never receives the token in the body: it goes out as an HttpOnly cookie
        // the browser replays on its own, so no script running in the panel can read it.
        reply.setCookie(ADMIN_SESSION_COOKIE, data.accessToken, adminSessionCookieOptions());

        return reply.code(200).send({
          user: _.omit(data.user, ['password']),
        });
      } catch (err) {
        throw err;
      }
    },
  );

  /**
   * An HttpOnly cookie cannot be cleared by the panel, so ending a session has to come back
   * here. Unauthenticated on purpose: it only clears a cookie, and a caller whose session
   * already expired must still be able to tidy up.
   */
  fastify.post('/admin/logout', { schema: adminLogoutSchema }, async (request, reply) => {
    reply.clearCookie(ADMIN_SESSION_COOKIE, clearAdminSessionCookieOptions());
    return reply.code(200).send({ ok: true });
  });
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
