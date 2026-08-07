import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { User } from '@saas-boilerplate/types';

import { AccessTokenAudience, AuthorizationService } from '../services/authorization.js';
import { ADMIN_SESSION_COOKIE } from '../utils/admin-session.js';
import { MEMBER_ACCESS_COOKIE } from '../utils/member-session.js';
import { isAdminRole } from '../utils/roles.js';

/**
 * Admin API lives under `/api/v1/admin`. Never select the other audience's cookie.
 */
export function expectedAccessAudience(request: FastifyRequest): AccessTokenAudience {
  const path = (request.url ?? '').split('?')[0] ?? '';
  if (path === '/api/v1/admin' || path.startsWith('/api/v1/admin/')) {
    return 'admin';
  }
  return 'member';
}

function selectAccessToken(request: FastifyRequest): string | null {
  const headerValue = request.headers['authorization'] || '';
  const matches = headerValue.match(/bearer\s+(\S+)/i);
  if (matches?.[1]) {
    return matches[1];
  }

  const audience = expectedAccessAudience(request);
  if (audience === 'admin') {
    return request.cookies?.[ADMIN_SESSION_COOKIE] ?? null;
  }
  return request.cookies?.[MEMBER_ACCESS_COOKIE] ?? null;
}

/**
 * Authorization plugin that handle every step in authorization process.
 */
async function authorization(fastify: FastifyInstance) {
  const { httpErrors, prisma } = fastify;
  const authorizationService = new AuthorizationService({
    prisma,
  });
  async function verifyToken(request: FastifyRequest) {
    const token = selectAccessToken(request);
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
      request.loggedUser = await authorizationService.verifyAccessToken(token, {
        audience: expectedAccessAudience(request),
      });
    } catch (err) {
      // Expired, malformed, wrong audience, stale token_version, or missing user —
      // all of these are "not authenticated", not a server error.
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
