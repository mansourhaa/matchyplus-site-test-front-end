export const AUTH_COOKIE = 'access_token';
export const AUTH_USER_KEY = 'user';
export const AUTH_REFRESH_TOKEN_KEY = 'refresh_token';

/** `Secure` outside development only, so the cookie still works over plain http on localhost. */
const SECURE_COOKIE_FLAG = process.env.NODE_ENV === 'production' ? '; Secure' : '';

export function setAuthCookie(token: string, maxAgeSeconds = 60 * 60 * 24) {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${SECURE_COOKIE_FLAG}`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('access_token', token);
  setAuthCookie(token);
}

export function setRefreshToken(token: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUTH_REFRESH_TOKEN_KEY, token);
}

export function persistAuthSession(token: string, user: unknown, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('access_token', token);
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  if (refreshToken) {
    sessionStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  }
  setAuthCookie(token);
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  clearAuthCookie();
}
