import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Defense-in-depth against CSRF now that member (and admin) sessions ride on HttpOnly
 * cookies the browser attaches automatically. SameSite=Lax already blocks most
 * cross-site cookie-bearing requests, but a plain HTML form POST is still a browser-
 * enforced gap in some configurations — rejecting a request whose Origin/Referer isn't
 * one of the deployed frontends closes that gap for every state-changing route, not
 * just the auth ones.
 *
 * Reuses CORS_ORIGINS (see plugins/cors.ts) rather than introducing a second allowlist —
 * any origin trusted enough to read a CORS response is trusted enough to submit a form.
 */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseAllowedOrigins(): string[] {
  return (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

async function originGuard(fastify: FastifyInstance) {
  const allowedOrigins = parseAllowedOrigins();

  // Outside development, plugins/cors.ts already refuses to boot with an empty
  // allowlist — by the time this hook runs, allowedOrigins is guaranteed non-empty
  // there. In development, an empty allowlist means "don't restrict," matching cors.ts.
  if (allowedOrigins.length === 0 && process.env['NODE_ENV'] !== 'development') {
    return;
  }

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (allowedOrigins.length === 0 || !STATE_CHANGING_METHODS.has(request.method)) {
      return;
    }

    const refererHeader = request.headers.referer;
    const presentedOrigin =
      request.headers.origin || (refererHeader ? originOf(refererHeader) : null);

    // No Origin/Referer at all: not a browser-driven request relying on an ambient
    // cookie (e.g. a mobile app or server-to-server call using its own Bearer token) —
    // nothing here for this check to protect against.
    if (!presentedOrigin) {
      return;
    }

    if (!allowedOrigins.includes(presentedOrigin)) {
      return reply.code(403).send({
        status: 403,
        code: 'origin_not_allowed',
        message: 'Request origin is not allowed.',
      });
    }
  });
}

export default fp(originGuard, {
  name: 'origin-guard',
  dependencies: ['cors'],
});
