import type { FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'node:crypto';

import { config } from '../config.js';

export const MATCHY_CLIENT_HEADER = 'x-matchy-client';
export const MATCHY_MOBILE_KEY_HEADER = 'x-matchy-mobile-key';

/**
 * Capacitor clients send `X-Matchy-Client: mobile|capacitor` plus
 * `X-Matchy-Mobile-Key` matching `MOBILE_CLIENT_SECRET`.
 *
 * The client label alone is spoofable from any browser/XSS — body JWTs and body
 * refresh are only enabled when the native build's shared secret is present.
 * See doc/features/authentication.md § Mobile (Capacitor).
 */
export function isMobileClientLabel(request: FastifyRequest): boolean {
  const raw = request.headers[MATCHY_CLIENT_HEADER];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase() ?? '';
  return value === 'mobile' || value === 'capacitor';
}

function headerValue(request: FastifyRequest, name: string): string {
  const raw = request.headers[name];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
}

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * True only when the request is labeled mobile **and** presents the configured
 * mobile client secret. Fail closed when `MOBILE_CLIENT_SECRET` is unset — never
 * emit body JWTs based on a spoofable header alone.
 */
export function isAuthorizedMobileClient(request: FastifyRequest): boolean {
  if (!isMobileClientLabel(request)) return false;
  const expected = config.mobileClientSecret;
  if (!expected) return false;
  const provided = headerValue(request, MATCHY_MOBILE_KEY_HEADER);
  if (!provided) return false;
  return secretsEqual(provided, expected);
}

/** @deprecated Use `isAuthorizedMobileClient` — label alone must not authorize body JWTs. */
export function isMobileClientRequest(request: FastifyRequest): boolean {
  return isAuthorizedMobileClient(request);
}
