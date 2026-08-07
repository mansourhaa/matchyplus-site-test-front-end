/**
 * Shared route-auth helpers for proxy.ts (edge) and the (dashboard) server layout.
 * Presence-only cookie checks are not enough — empty/malformed/expired tokens must
 * fail closed so (dashboard) never renders for an unauthenticated visitor.
 */

/** Routes that bounce *away* when a usable session cookie is present. */
export const PUBLIC_AUTH_ROUTES = ['/login'] as const;

/**
 * Always allowed regardless of auth. See proxy.ts for why each path is neutral.
 */
export const NEUTRAL_ROUTES = ['/oauth-callback', '/onboarding', '/register'] as const;

/**
 * URL prefixes that map to `app/(dashboard)/**`. Used for tests and docs — the
 * runtime gate is deny-by-default (anything not public/neutral requires auth).
 */
export const DASHBOARD_PATH_PREFIXES = [
  '/',
  '/home',
  '/matches',
  '/chat',
  '/profile',
  '/notifications',
  '/edit-profile',
  '/settings',
] as const;

const CLOCK_SKEW_SECONDS = 30;

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isNeutralRoute(pathname: string): boolean {
  return NEUTRAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Deny-by-default: every non-public, non-neutral path needs a usable access token. */
export function requiresAuthentication(pathname: string): boolean {
  if (isNeutralRoute(pathname) || isPublicAuthRoute(pathname)) return false;
  return true;
}

/**
 * Routes where the client must not probe `/auth/authcheck` on bootstrap.
 * - `/login`: proxy already redirects away when a usable cookie exists; a failed
 *   probe only adds noise. Cap with Preferences tokens is handled separately.
 * - `/oauth-callback`: session is established by exchange, not by a prior probe.
 * - `/register`: dead redirect to onboarding.
 */
const SKIP_BOOTSTRAP_AUTHCHECK_PREFIXES = ['/login', '/oauth-callback', '/register'] as const;

export function skipsBootstrapAuthCheck(pathname: string): boolean {
  return SKIP_BOOTSTRAP_AUTHCHECK_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json =
      typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

/**
 * Fail-closed cookie check for edge + RSC. Does not verify JWT signature (that
 * stays with the API); rejects missing, empty, malformed, or expired tokens so
 * stale cookies cannot keep (dashboard) open.
 */
export function hasUsableAccessTokenCookie(token: string | undefined | null): boolean {
  if (!token || !token.trim()) return false;
  const payload = decodeJwtPayload(token.trim());
  if (!payload) return false;
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now - CLOCK_SKEW_SECONDS;
}
