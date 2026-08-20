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

/** Mirrors API ACCESS_TOKEN_TTL (default 1h). Marker is not a credential — API JWT is. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = (() => {
  const raw = process.env.NEXT_PUBLIC_ACCESS_TOKEN_TTL ?? process.env.ACCESS_TOKEN_TTL ?? '1h';
  if (/^\d+$/.test(raw.trim())) return Number(raw.trim());
  const match = /^(\d+(?:\.\d+)?)(s|m|h|d)$/i.exec(raw.trim());
  if (!match) return 60 * 60;
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return Math.floor(amount * (multipliers[unit] ?? 3600));
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
  clearSessionMarker();
  void api.post('/auth/admin/logout', null, { withCredentials: true }).catch(() => {});
}
