import { describe, expect, it } from 'vitest';

import { resolvePostAuthDestination } from './post-auth-routing';

describe('resolvePostAuthDestination — onboarding complete', () => {
  it('defaults to / when no next param is given', () => {
    expect(resolvePostAuthDestination(undefined, true)).toBe('/');
    expect(resolvePostAuthDestination(null, true)).toBe('/');
    expect(resolvePostAuthDestination('', true)).toBe('/');
  });

  it('preserves a safe next param', () => {
    expect(resolvePostAuthDestination('/projects', true)).toBe('/projects');
    expect(resolvePostAuthDestination('/settings?tab=profile', true)).toBe('/settings?tab=profile');
  });

  it('rejects a protocol-relative URL (open redirect)', () => {
    expect(resolvePostAuthDestination('//evil.example.com', true)).toBe('/');
  });

  it('rejects a next param that does not start with /', () => {
    expect(resolvePostAuthDestination('https://evil.example.com', true)).toBe('/');
    expect(resolvePostAuthDestination('evil.example.com', true)).toBe('/');
  });

  it.each(['/login', '/register', '/oauth-callback', '/onboarding', '/api/v1/auth/account'])(
    'rejects auth-flow/API/onboarding-shaped paths like %s',
    (unsafePath) => {
      expect(resolvePostAuthDestination(unsafePath, true)).toBe('/');
    },
  );
});

describe('resolvePostAuthDestination — onboarding incomplete', () => {
  it('always routes to /onboarding, ignoring the default destination', () => {
    expect(resolvePostAuthDestination(undefined, false)).toBe('/onboarding');
    expect(resolvePostAuthDestination(null, false)).toBe('/onboarding');
  });

  it("never lets a next param skip onboarding — carries it through as onboarding's own next", () => {
    expect(resolvePostAuthDestination('/projects', false)).toBe('/onboarding?next=%2Fprojects');
  });

  it('drops an unsafe next param entirely rather than carrying it through', () => {
    expect(resolvePostAuthDestination('https://evil.example.com', false)).toBe('/onboarding');
    expect(resolvePostAuthDestination('//evil.example.com', false)).toBe('/onboarding');
  });
});
