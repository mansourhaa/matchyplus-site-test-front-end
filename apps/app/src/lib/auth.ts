// Name of the HttpOnly session cookie the API sets on login/register/refresh — read only
// by Next.js middleware (see proxy.ts) for route guarding. Never JS-writable or
// JS-readable: neither token is visible to this app's own code (see lib/api.ts, which
// relies on the browser attaching it automatically instead).
export const AUTH_COOKIE = 'access_token';
export const AUTH_USER_KEY = 'user';

/** Cached profile only — never a token, which no longer exists in JS-visible storage. */
export function persistAuthUser(user: unknown) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function getCachedAuthUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(AUTH_USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
