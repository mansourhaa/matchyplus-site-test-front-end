import { CookieSerializeOptions } from '@fastify/cookie';

import { config } from '../config.js';

/**
 * Carries the admin panel's JWT. Set by the API rather than by the panel, because only a
 * `Set-Cookie` header can mark a cookie HttpOnly — a script injected into the panel can then
 * no longer read the token, which both sessionStorage and a JS-written cookie allowed.
 */
export const ADMIN_SESSION_COOKIE = 'admin_access_token';
export const ADMIN_REFRESH_COOKIE = 'admin_refresh_token';

/** Seconds, matching the access token's own lifetime so the two never disagree. */
function sessionMaxAge(): number {
  return config.accessTokenTtlSeconds;
}

/**
 * `Secure` everywhere except development, so staging is not served a session cookie over
 * plain http. ADMIN_COOKIE_DOMAIN is only needed when the API and the panel sit on different
 * subdomains; left unset the cookie is host-only, which is what localhost wants.
 */
function baseOptions(): CookieSerializeOptions {
  const domain = process.env['ADMIN_COOKIE_DOMAIN'];
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] !== 'development',
    sameSite: 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export function adminSessionCookieOptions(): CookieSerializeOptions {
  return { ...baseOptions(), maxAge: sessionMaxAge() };
}

/** Same attributes, zero lifetime: anything else and the browser keeps the original cookie. */
export function clearAdminSessionCookieOptions(): CookieSerializeOptions {
  return { ...baseOptions(), maxAge: 0 };
}

// Scoped to the admin auth routes only — the browser never attaches this cookie to any
// other request, shrinking where a stolen refresh token could otherwise be replayed from.
// Narrower than the member refresh cookie's `/api/v1/auth` scope on purpose: admin has no
// other route under `/api/v1/auth/admin` that would ever need to read it.
export function adminRefreshCookieOptions(): CookieSerializeOptions {
  return {
    ...baseOptions(),
    path: '/api/v1/auth/admin',
    maxAge: config.adminRefreshTokenTtlSeconds,
  };
}

export function clearAdminRefreshCookieOptions(): CookieSerializeOptions {
  return { ...baseOptions(), path: '/api/v1/auth/admin', maxAge: 0 };
}
