import type { FastifyRequest } from 'fastify';

/**
 * Capacitor / native clients send `X-Matchy-Client: mobile` (or `capacitor`).
 * Those clients cannot rely on cross-origin HttpOnly cookies the way the browser SPA
 * does, so auth routes may return JWTs in the JSON body for them only — see
 * doc/features/authentication.md § Mobile (Capacitor).
 */
export function isMobileClientRequest(request: FastifyRequest): boolean {
  const raw = request.headers['x-matchy-client'];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase() ?? '';
  return value === 'mobile' || value === 'capacitor';
}
