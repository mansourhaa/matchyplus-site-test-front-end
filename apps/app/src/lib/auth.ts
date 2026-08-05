// Name of the session cookie the API sets on login/register/refresh — read by Next.js
// middleware (see proxy.ts) for route guarding. On the web it is HttpOnly (JS cannot
// read it). On Capacitor, lib/mobile-tokens.ts mirrors a Path=/ cookie onto the app
// origin so proxy.ts still works when the API cookie Domain does not cover the WebView.
import { mobileTokenStorage } from './mobile-tokens';

export const AUTH_COOKIE = 'access_token';
export const AUTH_USER_KEY = 'user';

/** Cached profile only — never a token on web. Cap stores JWTs separately in localStorage. */
export function persistAuthUser(user: unknown) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_USER_KEY);
  mobileTokenStorage.clear();
}

export function getCachedAuthUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(AUTH_USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
