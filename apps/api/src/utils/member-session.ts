import { CookieSerializeOptions } from '@fastify/cookie';

import { config } from '../config.js';

/**
 * Carry the member session's JWTs. Set by the API rather than the SPA, because only a
 * `Set-Cookie` header can mark a cookie HttpOnly — a script injected into the app can then
 * no longer read either token, which sessionStorage and a JS-written cookie both allowed.
 * Named differently from the admin panel's own session cookie so the two never collide.
 */
export const MEMBER_ACCESS_COOKIE = 'access_token';
export const MEMBER_REFRESH_COOKIE = 'refresh_token';

/**
 * `Secure` everywhere except development, so staging is not served a session cookie over
 * plain http. MEMBER_COOKIE_DOMAIN is only needed when the API and the app sit on different
 * subdomains; left unset the cookie is host-only, which is what localhost wants.
 */
function baseOptions(): CookieSerializeOptions {
  const domain = process.env['MEMBER_COOKIE_DOMAIN'];
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] !== 'development',
    sameSite: 'lax',
    ...(domain ? { domain } : {}),
  };
}

export function memberAccessCookieOptions(): CookieSerializeOptions {
  return {
    ...baseOptions(),
    path: '/',
    maxAge: config.accessTokenTtlSeconds,
  };
}

// Scoped to the auth routes only — the browser never attaches this cookie to any other
// request, shrinking where a stolen refresh token could otherwise be replayed from.
export function memberRefreshCookieOptions(): CookieSerializeOptions {
  return {
    ...baseOptions(),
    path: '/api/v1/auth',
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60,
  };
}

/** Same attributes, zero lifetime: anything else and the browser keeps the original cookie. */
export function clearMemberAccessCookieOptions(): CookieSerializeOptions {
  return { ...baseOptions(), path: '/', maxAge: 0 };
}

export function clearMemberRefreshCookieOptions(): CookieSerializeOptions {
  return { ...baseOptions(), path: '/api/v1/auth', maxAge: 0 };
}
