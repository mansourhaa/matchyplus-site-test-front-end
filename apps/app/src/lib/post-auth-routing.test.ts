import { describe, expect, it } from 'vitest';

import { resolvePostAuthDestination } from './post-auth-routing';

describe('resolvePostAuthDestination — onboarding complete', () => {
  it('defaults to /home when no next param is given', () => {
    expect(resolvePostAuthDestination(undefined, true)).toBe('/home');
    expect(resolvePostAuthDestination(null, true)).toBe('/home');
    expect(resolvePostAuthDestination('', true)).toBe('/home');
  });

  it('preserves a safe next param', () => {
    expect(resolvePostAuthDestination('/matches', true)).toBe('/matches');
    expect(resolvePostAuthDestination('/settings?tab=profile', true)).toBe('/settings?tab=profile');
  });

  it('rejects a protocol-relative URL (open redirect)', () => {
    expect(resolvePostAuthDestination('//evil.example.com', true)).toBe('/home');
  });

  it('rejects a next param that does not start with /', () => {
    expect(resolvePostAuthDestination('https://evil.example.com', true)).toBe('/home');
    expect(resolvePostAuthDestination('evil.example.com', true)).toBe('/home');
  });

  it.each([
    '/connexion',
    '/login',
    '/inscription',
    '/register',
    '/oauth-callback',
    '/onboarding',
    '/api/v1/auth/account',
  ])('rejects auth-flow/API/onboarding-shaped paths like %s', (unsafePath) => {
    expect(resolvePostAuthDestination(unsafePath, true)).toBe('/home');
  });
});

describe('resolvePostAuthDestination — onboarding incomplete', () => {
  it('always routes to /inscription, ignoring the default destination', () => {
    expect(resolvePostAuthDestination(undefined, false)).toBe('/inscription');
    expect(resolvePostAuthDestination(null, false)).toBe('/inscription');
  });

  it("never lets a next param skip onboarding — carries it through as registration's own next", () => {
    expect(resolvePostAuthDestination('/matches', false)).toBe('/inscription?next=%2Fmatches');
  });

  it('drops an unsafe next param entirely rather than carrying it through', () => {
    expect(resolvePostAuthDestination('https://evil.example.com', false)).toBe('/inscription');
    expect(resolvePostAuthDestination('//evil.example.com', false)).toBe('/inscription');
  });
});
