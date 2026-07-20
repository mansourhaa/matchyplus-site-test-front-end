export const ADMIN_AUTH_COOKIE = 'admin_access_token';
export const ADMIN_AUTH_TOKEN_KEY = 'admin_access_token';
export const ADMIN_AUTH_USER_KEY = 'admin_user';

/** The admin panel mirrors the source project's 8 hour session window. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function setAdminAuthCookie(token: string, maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  document.cookie = `${ADMIN_AUTH_COOKIE}=${token}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearAdminAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${ADMIN_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function persistAdminSession(token: string, admin: unknown) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_AUTH_USER_KEY, JSON.stringify(admin));
  setAdminAuthCookie(token);
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_AUTH_USER_KEY);
  clearAdminAuthCookie();
}
