import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';

import { User } from '@saas-boilerplate/types';

import { isAdminRole } from '../constants.js';
import { AuthorizationService } from '../services/authorization.js';
import { ADMIN_SESSION_COOKIE } from '../utils/admin-session.js';

/**
 * Authorization plugin that handle every step in authorization process.
 *
 */
async function authorization(fastify: FastifyInstance) {
  const { httpErrors, prisma } = fastify;
  const authorizationService = new AuthorizationService({
    prisma,
  });
  async function verifyToken(request: FastifyRequest) {
    const headerValue = request.headers['authorization'] || '';

    const matches = headerValue.match(/bearer\s+(\S+)/i);
    // The admin panel holds its token in an HttpOnly cookie, so it cannot set the header —
    // the browser replays the cookie instead. Other clients keep using the bearer header.
    const token = matches ? matches[1] : (request.cookies?.[ADMIN_SESSION_COOKIE] ?? null);
    if (!token) {
      throw httpErrors.unauthorized(
        // @ts-ignore
        request.t('entity-not-found', {
          // @ts-ignore
          entity: request.t('token'),
        }) as string,
      );
    }
    try {
      request.loggedUser = await authorizationService.verifyAccessToken(token as string);
    } catch (err) {
      // Expired, malformed, or pointing at a user that no longer exists — all of these are
      // "not authenticated", not a server error, so surface 401 rather than 500.
      throw httpErrors.unauthorized(
        // @ts-ignore
        request.t('invalid_token') as string,
      );
    }
  }

  /**
   * Must run after `verifyToken`, which is what populates `request.loggedUser`.
   */
  async function verifyAdmin(request: FastifyRequest) {
    if (!request.loggedUser || !isAdminRole(request.loggedUser.role)) {
      throw httpErrors.forbidden(
        // @ts-ignore
        request.t('admin_access_required') as string,
      );
    }
  }

  fastify.decorate<any>('verifyToken', verifyToken);
  fastify.decorate<any>('verifyAdmin', verifyAdmin);
  fastify.decorateRequest<User | null>('loggedUser', null);
}

export default fp(authorization, {
  name: 'authorization',
  dependencies: ['sensible', 'prisma'],
});
