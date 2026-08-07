import { AUTH_COOKIE } from './auth';
import { isNativeMobileClient } from './native';

const MOBILE_ACCESS_KEY = 'matchy_mobile_access';
const MOBILE_REFRESH_KEY = 'matchy_mobile_refresh';

/**
 * Native (Capacitor) session tokens. Browser web keeps using HttpOnly cookies only —
 * see doc/features/authentication.md § Mobile (Capacitor).
 *
 * A non-HttpOnly `access_token` cookie is also mirrored onto the Next.js origin so
 * `proxy.ts` can still gate routes when the API cookie Domain does not cover the
 * WebView host (local emulator / capacitor://).
 */
export const mobileTokenStorage = {
  getAccess(): string | null {
    if (!isNativeMobileClient() || typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(MOBILE_ACCESS_KEY);
    } catch {
      return null;
    }
  },

  getRefresh(): string | null {
    if (!isNativeMobileClient() || typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(MOBILE_REFRESH_KEY);
    } catch {
      return null;
    }
  },

  set(tokens: { accessToken?: string | null; refreshToken?: string | null }) {
    if (!isNativeMobileClient() || typeof localStorage === 'undefined') return;
    try {
      if (tokens.accessToken) {
        localStorage.setItem(MOBILE_ACCESS_KEY, tokens.accessToken);
        mirrorAccessCookieForProxy(tokens.accessToken);
      }
      if (tokens.refreshToken) {
        localStorage.setItem(MOBILE_REFRESH_KEY, tokens.refreshToken);
      }
    } catch {
      // ignore quota / private mode
    }
  },

  clear() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(MOBILE_ACCESS_KEY);
      localStorage.removeItem(MOBILE_REFRESH_KEY);
    } catch {
      // ignore
    }
    clearMirroredAccessCookie();
  },
};

/**
 * Remaining lifetime for the mirrored proxy cookie. Returns null when the JWT is
 * missing `exp`, unreadable, or already expired — never invent a positive Max-Age for
 * an expired token (that would briefly reopen protected routes via proxy.ts).
 */
export function accessTokenCookieMaxAge(accessToken: string): number | null {
  try {
    const payloadSegment = accessToken.split('.')[1];
    if (!payloadSegment) return null;
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const payload = JSON.parse(atob(normalized + pad)) as { exp?: number };
    if (typeof payload.exp === 'number') {
      const remaining = payload.exp - Math.floor(Date.now() / 1000);
      return remaining > 0 ? remaining : null;
    }
  } catch {
    // ignore malformed JWTs
  }
  return null;
}

function mirrorAccessCookieForProxy(accessToken: string) {
  if (typeof document === 'undefined') return;
  const maxAge = accessTokenCookieMaxAge(accessToken);
  if (maxAge == null) {
    // Expired / unreadable — drop any stale mirrored cookie so proxy.ts fails closed.
    clearMirroredAccessCookie();
    return;
  }
  // Intentionally not HttpOnly — Cap already holds the JWT in localStorage for Bearer.
  // This only exists so Next.js proxy.ts can see a cookie on the app origin.
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearMirroredAccessCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Re-apply the mirrored app-origin cookie from localStorage on Cap cold start.
 * WebView session cookies may be gone while Bearer JWTs in localStorage survive.
 */
export function syncMirroredAccessCookieFromStorage() {
  if (!isNativeMobileClient()) return;
  const access = mobileTokenStorage.getAccess();
  if (access) {
    mirrorAccessCookieForProxy(access);
  } else {
    clearMirroredAccessCookie();
  }
}

/** Pull tokens from an auth JSON body when present (mobile login/register/refresh/oauth). */
export function captureMobileTokensFromBody(data: unknown) {
  if (!isNativeMobileClient() || !data || typeof data !== 'object') return;
  const body = data as { accessToken?: string; refreshToken?: string };
  if (body.accessToken || body.refreshToken) {
    mobileTokenStorage.set({
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    });
  }
}
