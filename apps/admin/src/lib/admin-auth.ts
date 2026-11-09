import { api } from './api';

/**
 * The admin session token itself is an HttpOnly cookie owned by the API (`admin_access_token`),
 * so nothing in this module can read or write it — that is the point. A script injected into
 * the panel finds no credential in sessionStorage and none in document.cookie.
 *
 * Non-secret marker meaning "an admin session was opened". The middleware needs *something*
 * readable to decide on redirects, and it cannot read the HttpOnly cookie once the API lives
 * on another host. Forging this grants nothing on its own: every admin request is still
 * authorised by the API against the HttpOnly cookie.
 */
export const ADMIN_SESSION_COOKIE = 'admin_session';

/** The admin's own profile — name, email, role. Not a credential; used to render the panel. */
export const ADMIN_AUTH_USER_KEY = 'admin_user';

/**
 * Lifetime for the JS-writable session marker cookie.
 *
 * Deliberately set to the **admin refresh token TTL** (not the access token TTL). The marker
 * is renewed on every successful proactive refresh, so it never reaches this ceiling under
 * normal use. However, a transient network outage can cause several proactive refreshes to
 * fail in a row — if the marker max-age equalled ACCESS_TOKEN_TTL (e.g. 1 h), one missed
 * refresh cycle would start a countdown that ends in the middleware bouncing a still-valid
 * admin session to /login. Using the refresh TTL means the marker can survive many missed
 * cycles before it would naturally expire, giving the refresh loop plenty of time to recover.
 *
 * Reading priority: NEXT_PUBLIC_ADMIN_REFRESH_TOKEN_TTL → ADMIN_REFRESH_TOKEN_TTL →
 * NEXT_PUBLIC_ACCESS_TOKEN_TTL → ACCESS_TOKEN_TTL → 12 h default (matches API default).
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = (() => {
  function parseDuration(raw: string): number {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const match = /^(\d+(?:\.\d+)?)(s|m|h|d)$/i.exec(trimmed);
    if (!match) return 12 * 3600; // 12 h — matches ADMIN_REFRESH_TOKEN_TTL default
    const amount = Number(match[1]);
    const unit = match[2]!.toLowerCase();
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Math.floor(amount * (multipliers[unit] ?? 3600));
  }

  // Prefer the refresh token TTL so the marker outlives any access token TTL misconfiguration.
  const refreshRaw =
    process.env.NEXT_PUBLIC_ADMIN_REFRESH_TOKEN_TTL ?? process.env.ADMIN_REFRESH_TOKEN_TTL;
  if (refreshRaw) return parseDuration(refreshRaw);

  // Fall back to access token TTL only when no refresh TTL is exposed to the client.
  const accessRaw =
    process.env.NEXT_PUBLIC_ACCESS_TOKEN_TTL ?? process.env.ACCESS_TOKEN_TTL ?? '12h';
  return parseDuration(accessRaw);
})();

/** `Secure` as soon as this is not a developer machine, so staging is covered as well. */
const SECURE_COOKIE_FLAG = process.env.NODE_ENV === 'development' ? '' : '; Secure';

function setSessionMarker(maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${ADMIN_SESSION_COOKIE}=1; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${SECURE_COOKIE_FLAG}`;
}

function clearSessionMarker() {
  if (typeof document === 'undefined') return;
  document.cookie = `${ADMIN_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax${SECURE_COOKIE_FLAG}`;
}

export function hasAdminSessionMarker(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((entry) => entry.startsWith(`${ADMIN_SESSION_COOKIE}=`));
}

export function persistAdminSession(admin: unknown, maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_AUTH_USER_KEY, JSON.stringify(admin));
  setSessionMarker(maxAgeSeconds);
}

/**
 * `proxy.ts` gates every dashboard navigation on this marker's presence, not on the real
 * HttpOnly access token it can't see — so its own expiry has to track the real session's
 * lifetime, not just the value set once at login. Without this, a refreshed access token
 * would still expire the marker on schedule and bounce a legitimately-still-logged-in admin
 * back to /login. Call this after every successful refresh (reactive or proactive).
 */
export function refreshAdminSessionMarker(maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS) {
  setSessionMarker(maxAgeSeconds);
}

/**
 * Only the API can drop an HttpOnly cookie, hence the logout call. A failure is ignored on
 * purpose: the local session is torn down either way and the cookie expires on its own, so a
 * dead network must never leave an admin stuck in the panel.
 */
export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_AUTH_USER_KEY);
  try {
    localStorage.removeItem('persist:root');
  } catch {
    // Ignore environments where localStorage is restricted
  }
  clearSessionMarker();
  void api.post('/auth/admin/logout', null, { withCredentials: true }).catch(() => {});
}
