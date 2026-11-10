import { AUTH_COOKIE } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { proxy } from './proxy';

vi.mock('@/lib/landing', () => ({
  getLandingBaseUrl: () => 'https://landing.test',
}));

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

function request(path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie !== undefined) {
    headers.set('cookie', `${AUTH_COOKIE}=${cookie}`);
  }
  return new NextRequest(new URL(path, 'https://app.test'), { headers });
}

function location(res: Response): string {
  return res.headers.get('location') ?? '';
}

describe('proxy auth gate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('redirects unauthenticated visitors away from every (dashboard) path', () => {
    const paths = [
      '/',
      '/home',
      '/matches',
      '/chat/1',
      '/profile/u1',
      '/notifications',
      '/edit-profile',
      '/settings',
      '/settings/account',
      '/settings/password',
      '/settings/video',
      '/settings/qr-code',
      '/settings/add-phone-number',
    ];
    for (const path of paths) {
      const res = proxy(request(path));
      expect(res.status).toBe(307);
      expect(location(res)).toBe('https://app.test/connexion');
    }
  });

  it('rejects expired or malformed cookies on protected paths', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(location(proxy(request('/home', makeJwt({ exp: now - 120 }))))).toContain('/connexion');
    expect(location(proxy(request('/home', 'garbage')))).toContain('/connexion');
    expect(location(proxy(request('/home', '')))).toContain('/connexion');
  });

  it('allows a usable session through to (dashboard) routes', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeJwt({ exp: now + 3600, sub: 'u1' });
    const res = proxy(request('/home', token));
    expect(res.status).toBe(200);
  });

  it('redirects legacy /login to /connexion', () => {
    const res = proxy(request('/login'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/connexion');
  });

  it('redirects legacy /register to /onboarding for first-time visitors', () => {
    const resRegister = proxy(request('/register'));
    expect(resRegister.status).toBe(307);
    expect(location(resRegister)).toBe('https://app.test/onboarding');
  });

  it('keeps neutral routes open without a session, including /onboarding and /activer', () => {
    expect(proxy(request('/oauth-callback')).status).toBe(200);
    expect(proxy(request('/inscription')).status).toBe(200);
    expect(proxy(request('/onboarding')).status).toBe(200);
    expect(proxy(request('/reset-password')).status).toBe(200);
    expect(proxy(request('/privacy-policy')).status).toBe(200);
    expect(proxy(request('/terms-of-service')).status).toBe(200);
    expect(proxy(request('/activer')).status).toBe(200);
    expect(proxy(request('/activer?token=3bc226ada82b1ddfac69b0c6c5cf1ff4b2be99e426af6f4039c752240bb9f72e')).status).toBe(200);
  });

  it('sends authenticated visitors away from /connexion', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeJwt({ exp: now + 3600 });
    expect(location(proxy(request('/connexion', token)))).toContain('/home');
  });

  it('does not treat an expired cookie as authenticated on /connexion', () => {
    const now = Math.floor(Date.now() / 1000);
    const res = proxy(request('/connexion', makeJwt({ exp: now - 60 })));
    expect(res.status).toBe(200);
  });

  it('allows access to /connexion when switch=true is specified even if a session exists', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeJwt({ exp: now + 3600 });
    const res = proxy(request('/connexion?switch=true', token));
    expect(res.status).toBe(200);
  });

  it('allows access to /connexion when onboarding is incomplete via cookie', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeJwt({ exp: now + 3600 });
    const headers = new Headers();
    headers.set('cookie', `${AUTH_COOKIE}=${token}; matchy_onboarding_incomplete=1`);
    const req = new NextRequest(new URL('/connexion', 'https://app.test'), { headers });
    const res = proxy(req);
    expect(res.status).toBe(200);
  });
});
