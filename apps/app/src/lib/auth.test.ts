import { afterEach, describe, expect, it } from 'vitest';

import { AUTH_USER_KEY, clearAuthSession, getCachedAuthUser, persistAuthUser } from './auth';

describe('auth helpers', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('persists and reads back the cached user', () => {
    persistAuthUser({ id: 'user-1', email: 'user@example.com' });

    expect(sessionStorage.getItem(AUTH_USER_KEY)).toContain('user@example.com');
    expect(getCachedAuthUser()).toEqual({ id: 'user-1', email: 'user@example.com' });
  });

  it('returns null when no user is cached', () => {
    expect(getCachedAuthUser()).toBeNull();
  });

  it('clears the cached user', () => {
    persistAuthUser({ id: 'user-1' });

    clearAuthSession();

    expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
    expect(getCachedAuthUser()).toBeNull();
  });
});
