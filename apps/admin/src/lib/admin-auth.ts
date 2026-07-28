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

/** The admin panel mirrors the source project's 8 hour session window. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

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
