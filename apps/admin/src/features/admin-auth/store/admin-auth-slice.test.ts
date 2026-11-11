import { ADMIN_AUTH_USER_KEY } from '@/lib/admin-auth';
import { beforeEach, describe, expect, it } from 'vitest';

import reducer, {
  adminLogout,
  clearAdminError,
  readPersistedAdmin,
  selectAdminAuth,
} from './admin-auth-slice';

describe('adminAuthSlice', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('initializes with null admin when sessionStorage is empty', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.admin).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('safely handles corrupted JSON in sessionStorage without throwing', () => {
    sessionStorage.setItem(ADMIN_AUTH_USER_KEY, 'invalid-json-{[');
    expect(readPersistedAdmin()).toBeNull();
    expect(sessionStorage.getItem(ADMIN_AUTH_USER_KEY)).toBeNull();
  });

  it('resets admin and clears credentials on adminLogout', () => {
    const initialState = {
      loading: false,
      error: 'Some error',
      admin: { id: 'admin-1', email: 'admin@matchy.plus', name: 'Admin', role: 'SUPER_ADMIN' as const },
      loginAt: '2026-01-01T00:00:00.000Z',
      passwordChangeLoading: false,
      passwordChangeError: null,
    };

    const nextState = reducer(initialState, adminLogout());
    expect(nextState.admin).toBeNull();
    expect(nextState.error).toBeNull();
    expect(nextState.loginAt).toBeNull();
  });

  it('clears errors with clearAdminError', () => {
    const initialState = {
      loading: false,
      error: 'Error message',
      admin: null,
      loginAt: null,
      passwordChangeLoading: false,
      passwordChangeError: null,
    };

    const nextState = reducer(initialState, clearAdminError());
    expect(nextState.error).toBeNull();
  });

  it('derives isAuthenticated correctly in selectAdminAuth', () => {
    const unauthenticated = selectAdminAuth({
      adminAuth: {
        loading: false,
        error: null,
        admin: null,
        loginAt: null,
        passwordChangeLoading: false,
        passwordChangeError: null,
      },
    } as never);
    expect(unauthenticated.isAuthenticated).toBe(false);

    const authenticated = selectAdminAuth({
      adminAuth: {
        loading: false,
        error: null,
        admin: { id: 'admin-1', email: 'admin@matchy.plus', name: 'Admin', role: 'SUPER_ADMIN' as const },
        loginAt: null,
        passwordChangeLoading: false,
        passwordChangeError: null,
      },
    } as never);
    expect(authenticated.isAuthenticated).toBe(true);
  });
});
