import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIE } from './auth';
import {
  accessTokenCookieMaxAge,
  captureMobileTokensFromBody,
  hydrateMobileTokenStorage,
  mobileTokenStorage,
  resetMobileTokenHydrationForTests,
  syncMirroredAccessCookieFromStorage,
} from './mobile-tokens';
import * as native from './native';

vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>();
  return {
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        store.set(key, value);
      }),
      remove: vi.fn(async ({ key }: { key: string }) => {
        store.delete(key);
      }),
      __store: store,
    },
  };
});

function encodeJwtPayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `hdr.${b64}.sig`;
}

describe('mobile-tokens', () => {
  beforeEach(async () => {
    vi.spyOn(native, 'isNativeMobileClient').mockReturnValue(true);
    localStorage.clear();
    document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    resetMobileTokenHydrationForTests();
    const prefs = await import('@capacitor/preferences');
    (prefs.Preferences as unknown as { __store: Map<string, string> }).__store.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    resetMobileTokenHydrationForTests();
  });

  describe('accessTokenCookieMaxAge', () => {
    it('returns remaining seconds when the JWT is still valid', () => {
      const exp = Math.floor(Date.now() / 1000) + 120;
      expect(accessTokenCookieMaxAge(encodeJwtPayload({ exp }))).toBeGreaterThan(100);
      expect(accessTokenCookieMaxAge(encodeJwtPayload({ exp }))).toBeLessThanOrEqual(120);
    });

    it('returns null for an already-expired JWT (never invents a positive Max-Age)', () => {
      const exp = Math.floor(Date.now() / 1000) - 30;
      expect(accessTokenCookieMaxAge(encodeJwtPayload({ exp }))).toBeNull();
    });

    it('returns null for malformed tokens', () => {
      expect(accessTokenCookieMaxAge('not-a-jwt')).toBeNull();
      expect(accessTokenCookieMaxAge('a.b')).toBeNull();
    });
  });

  describe('hydrate + sync', () => {
    it('mirrors a valid access token with Max-Age from JWT exp', async () => {
      const exp = Math.floor(Date.now() / 1000) + 90;
      const token = encodeJwtPayload({ exp });
      const prefs = await import('@capacitor/preferences');
      await prefs.Preferences.set({ key: 'matchy_mobile_access', value: token });

      await hydrateMobileTokenStorage();
      syncMirroredAccessCookieFromStorage();

      expect(mobileTokenStorage.getAccess()).toBe(token);
      expect(document.cookie).toContain(`${AUTH_COOKIE}=`);
    });

    it('migrates legacy localStorage tokens into Preferences once', async () => {
      const exp = Math.floor(Date.now() / 1000) + 90;
      const token = encodeJwtPayload({ exp });
      localStorage.setItem('matchy_mobile_access', token);

      await hydrateMobileTokenStorage();

      expect(mobileTokenStorage.getAccess()).toBe(token);
      expect(localStorage.getItem('matchy_mobile_access')).toBeNull();
    });

    it('is a no-op on web', async () => {
      vi.mocked(native.isNativeMobileClient).mockReturnValue(false);
      localStorage.setItem('matchy_mobile_access', encodeJwtPayload({ exp: 9999999999 }));

      await hydrateMobileTokenStorage();
      syncMirroredAccessCookieFromStorage();

      expect(document.cookie.includes(`${AUTH_COOKIE}=`)).toBe(false);
    });
  });

  describe('captureMobileTokensFromBody', () => {
    it('stores both tokens and mirrors the access cookie', () => {
      const exp = Math.floor(Date.now() / 1000) + 60;
      const accessToken = encodeJwtPayload({ exp });
      const refreshToken = 'refresh-1';

      captureMobileTokensFromBody({ accessToken, refreshToken });

      expect(mobileTokenStorage.getAccess()).toBe(accessToken);
      expect(mobileTokenStorage.getRefresh()).toBe(refreshToken);
      expect(document.cookie).toContain(`${AUTH_COOKIE}=`);
    });
  });
});
