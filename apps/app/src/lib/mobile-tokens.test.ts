import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_COOKIE } from './auth';
import {
  accessTokenCookieMaxAge,
  captureMobileTokensFromBody,
  mobileTokenStorage,
  syncMirroredAccessCookieFromStorage,
} from './mobile-tokens';
import * as native from './native';

function encodeJwtPayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `hdr.${b64}.sig`;
}

describe('mobile-tokens', () => {
  beforeEach(() => {
    vi.spyOn(native, 'isNativeMobileClient').mockReturnValue(true);
    localStorage.clear();
    document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
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

  describe('syncMirroredAccessCookieFromStorage', () => {
    it('mirrors a valid access token with Max-Age from JWT exp', () => {
      const exp = Math.floor(Date.now() / 1000) + 90;
      const token = encodeJwtPayload({ exp });
      localStorage.setItem('matchy_mobile_access', token);

      syncMirroredAccessCookieFromStorage();

      expect(document.cookie).toContain(`${AUTH_COOKIE}=`);
      expect(document.cookie).toContain(encodeURIComponent(token).slice(0, 20));
    });

    it('clears the mirrored cookie when the stored token is expired', () => {
      const exp = Math.floor(Date.now() / 1000) - 10;
      const token = encodeJwtPayload({ exp });
      localStorage.setItem('matchy_mobile_access', token);
      document.cookie = `${AUTH_COOKIE}=stale; Path=/; SameSite=Lax`;

      syncMirroredAccessCookieFromStorage();

      // Cleared cookies disappear from document.cookie
      expect(document.cookie.includes(`${AUTH_COOKIE}=`)).toBe(false);
    });

    it('is a no-op on web', () => {
      vi.mocked(native.isNativeMobileClient).mockReturnValue(false);
      localStorage.setItem('matchy_mobile_access', encodeJwtPayload({ exp: 9999999999 }));

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
