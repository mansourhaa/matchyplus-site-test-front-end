import { Preferences } from '@capacitor/preferences';

import { AUTH_COOKIE } from './auth';
import { isNativeMobileClient } from './native';

const MOBILE_ACCESS_KEY = 'matchy_mobile_access';
const MOBILE_REFRESH_KEY = 'matchy_mobile_refresh';

type MemoryTokens = {
  access: string | null;
  refresh: string | null;
};

const memory: MemoryTokens = { access: null, refresh: null };
let hydrated = false;

/**
 * Native (Capacitor) session tokens live in Capacitor Preferences (not localStorage).
 * Browser web keeps using HttpOnly cookies only — see doc/features/authentication.md.
 *
 * Sync getters read an in-memory cache hydrated at bootstrap so Axios interceptors stay sync.
 * A non-HttpOnly `access_token` cookie is also mirrored onto the Next.js origin so
 * `proxy.ts` can still gate routes when the API cookie Domain does not cover the WebView host.
 */
export const mobileTokenStorage = {
  getAccess(): string | null {
    if (!isNativeMobileClient()) return null;
    return memory.access;
  },

  getRefresh(): string | null {
    if (!isNativeMobileClient()) return null;
    return memory.refresh;
  },

  set(tokens: { accessToken?: string | null; refreshToken?: string | null }) {
    if (!isNativeMobileClient()) return;
    if (tokens.accessToken) {
      memory.access = tokens.accessToken;
      mirrorAccessCookieForProxy(tokens.accessToken);
      void Preferences.set({ key: MOBILE_ACCESS_KEY, value: tokens.accessToken }).catch(() => {});
    }
    if (tokens.refreshToken) {
      memory.refresh = tokens.refreshToken;
      void Preferences.set({ key: MOBILE_REFRESH_KEY, value: tokens.refreshToken }).catch(() => {});
    }
  },

  clear() {
    memory.access = null;
    memory.refresh = null;
    clearMirroredAccessCookie();
    if (!isNativeMobileClient()) return;
    void Preferences.remove({ key: MOBILE_ACCESS_KEY }).catch(() => {});
    void Preferences.remove({ key: MOBILE_REFRESH_KEY }).catch(() => {});
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(MOBILE_ACCESS_KEY);
        localStorage.removeItem(MOBILE_REFRESH_KEY);
      }
    } catch {
      // ignore
    }
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
    clearMirroredAccessCookie();
    return;
  }
  // Intentionally not HttpOnly — Cap holds the JWT in Preferences for Bearer.
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearMirroredAccessCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

async function migrateFromLocalStorage(): Promise<{
  access: string | null;
  refresh: string | null;
}> {
  if (typeof localStorage === 'undefined') {
    return { access: null, refresh: null };
  }
  let access: string | null = null;
  let refresh: string | null = null;
  try {
    access = localStorage.getItem(MOBILE_ACCESS_KEY);
    refresh = localStorage.getItem(MOBILE_REFRESH_KEY);
    if (access) localStorage.removeItem(MOBILE_ACCESS_KEY);
    if (refresh) localStorage.removeItem(MOBILE_REFRESH_KEY);
  } catch {
    // ignore
  }
  return { access, refresh };
}

/**
 * Load Preferences (and one-time localStorage migration) into the sync memory cache.
 * Call once before authcheck / Axios traffic on Cap.
 */
export async function hydrateMobileTokenStorage(): Promise<void> {
  if (!isNativeMobileClient() || hydrated) return;
  hydrated = true;

  try {
    const [accessPref, refreshPref] = await Promise.all([
      Preferences.get({ key: MOBILE_ACCESS_KEY }),
      Preferences.get({ key: MOBILE_REFRESH_KEY }),
    ]);

    let access = accessPref.value;
    let refresh = refreshPref.value;

    if (!access && !refresh) {
      const migrated = await migrateFromLocalStorage();
      access = migrated.access;
      refresh = migrated.refresh;
      if (access) {
        await Preferences.set({ key: MOBILE_ACCESS_KEY, value: access }).catch(() => {});
      }
      if (refresh) {
        await Preferences.set({ key: MOBILE_REFRESH_KEY, value: refresh }).catch(() => {});
      }
    }

    memory.access = access;
    memory.refresh = refresh;
  } catch {
    // Preferences unavailable in some test environments — fall back to migration only.
    const migrated = await migrateFromLocalStorage();
    memory.access = migrated.access;
    memory.refresh = migrated.refresh;
  }
}

/** Re-apply the mirrored app-origin cookie from the hydrated Cap token cache. */
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

/** Test helper — reset hydrate latch between tests. */
export function resetMobileTokenHydrationForTests() {
  hydrated = false;
  memory.access = null;
  memory.refresh = null;
}
