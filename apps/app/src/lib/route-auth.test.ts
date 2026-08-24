import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_PATH_PREFIXES,
  hasUsableAccessTokenCookie,
  isNeutralRoute,
  isPublicAuthRoute,
  requiresAuthentication,
  skipsBootstrapAuthCheck,
} from './route-auth';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('route-auth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats login as public and oauth/onboarding/register as neutral', () => {
    expect(isPublicAuthRoute('/login')).toBe(true);
    expect(isPublicAuthRoute('/login/extra')).toBe(true);
    expect(isNeutralRoute('/onboarding')).toBe(true);
    expect(isNeutralRoute('/oauth-callback')).toBe(true);
    expect(isNeutralRoute('/register')).toBe(true);
    expect(requiresAuthentication('/login')).toBe(false);
    expect(requiresAuthentication('/onboarding')).toBe(false);
  });

  it('requires auth for every known (dashboard) path prefix', () => {
    for (const prefix of DASHBOARD_PATH_PREFIXES) {
      if (prefix === '/') {
        expect(requiresAuthentication('/')).toBe(true);
        continue;
      }
      expect(requiresAuthentication(prefix)).toBe(true);
      expect(requiresAuthentication(`${prefix}/extra`)).toBe(true);
    }
    expect(requiresAuthentication('/home')).toBe(true);
    expect(requiresAuthentication('/settings/account')).toBe(true);
    expect(requiresAuthentication('/chat/abc')).toBe(true);
    expect(requiresAuthentication('/profile/xyz')).toBe(true);
  });

  it('skips bootstrap authcheck on login, oauth-callback, and register only', () => {
    expect(skipsBootstrapAuthCheck('/login')).toBe(true);
    expect(skipsBootstrapAuthCheck('/oauth-callback')).toBe(true);
    expect(skipsBootstrapAuthCheck('/register')).toBe(true);
    expect(skipsBootstrapAuthCheck('/onboarding')).toBe(false);
    expect(skipsBootstrapAuthCheck('/home')).toBe(false);
    expect(skipsBootstrapAuthCheck('/settings/account')).toBe(false);
  });

  it('rejects missing, empty, malformed, and expired cookies', () => {
    expect(hasUsableAccessTokenCookie(undefined)).toBe(false);
    expect(hasUsableAccessTokenCookie(null)).toBe(false);
    expect(hasUsableAccessTokenCookie('')).toBe(false);
    expect(hasUsableAccessTokenCookie('   ')).toBe(false);
    expect(hasUsableAccessTokenCookie('not-a-jwt')).toBe(false);
    expect(hasUsableAccessTokenCookie(makeJwt({ sub: 'u1' }))).toBe(false);
    expect(hasUsableAccessTokenCookie(makeJwt({ exp: 1_000_000_000 }))).toBe(false); // 2001
  });

  it('accepts a non-expired JWT-shaped cookie', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(hasUsableAccessTokenCookie(makeJwt({ exp: now + 3600, sub: 'u1' }))).toBe(true);
  });
});
