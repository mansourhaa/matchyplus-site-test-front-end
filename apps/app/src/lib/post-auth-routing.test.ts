import { describe, expect, it } from 'vitest';

import { resolvePostAuthDestination } from './post-auth-routing';

describe('resolvePostAuthDestination', () => {
  it('defaults to / when no next param is given', () => {
    expect(resolvePostAuthDestination(undefined)).toBe('/');
    expect(resolvePostAuthDestination(null)).toBe('/');
    expect(resolvePostAuthDestination('')).toBe('/');
  });

  it('preserves a safe next param', () => {
    expect(resolvePostAuthDestination('/projects')).toBe('/projects');
    expect(resolvePostAuthDestination('/settings?tab=profile')).toBe('/settings?tab=profile');
  });

  it('rejects a protocol-relative URL (open redirect)', () => {
    expect(resolvePostAuthDestination('//evil.example.com')).toBe('/');
  });

  it('rejects a next param that does not start with /', () => {
    expect(resolvePostAuthDestination('https://evil.example.com')).toBe('/');
    expect(resolvePostAuthDestination('evil.example.com')).toBe('/');
  });

  it.each(['/login', '/register', '/oauth-callback', '/api/v1/auth/account'])(
    'rejects auth-flow/API-shaped paths like %s',
    (unsafePath) => {
      expect(resolvePostAuthDestination(unsafePath)).toBe('/');
    },
  );
});
