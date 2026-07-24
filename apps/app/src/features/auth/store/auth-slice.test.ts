import { api } from '@/lib/api';
import { AUTH_USER_KEY } from '@/lib/auth';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../types';
import authReducer, {
  deleteAccount,
  fetchCurrentUser,
  registerPhone,
  resetAuthState,
} from './auth-slice';

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

const user: AuthUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: 'Jane Doe',
  auth_provider: 'phone',
  email_verified: false,
};

function buildStore(preloadedState?: Partial<ReturnType<typeof authReducer>>) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: preloadedState ? { auth: preloadedState as never } : undefined,
  });
}

describe('auth-slice', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerPhone', () => {
    it('sends { phone, password, code, name } to /auth/register-phone', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { access_token: 'access-1', refresh_token: 'refresh-1', user },
      });

      const store = buildStore();
      await store.dispatch(
        registerPhone({
          phone: '+21612345678',
          password: 'secret123',
          code: '123456',
          name: 'Jane Doe',
        }),
      );

      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', {
        phone: '+21612345678',
        password: 'secret123',
        code: '123456',
        name: 'Jane Doe',
      });
      expect(store.getState().auth.user).toEqual(user);
      expect(store.getState().auth.accessToken).toBe('access-1');
    });
  });

  describe('fetchCurrentUser.fulfilled', () => {
    it('re-persists the returned user to sessionStorage', async () => {
      const store = buildStore({
        loading: false,
        error: null,
        accessToken: 'existing-access-token',
        refreshToken: 'existing-refresh-token',
        user: null,
      });

      const updatedUser: AuthUser = { ...user, name: 'Updated Name' };
      vi.mocked(api.get).mockResolvedValue({ data: { user: updatedUser } });

      await store.dispatch(fetchCurrentUser());

      expect(store.getState().auth.user).toEqual(updatedUser);
      expect(sessionStorage.getItem(AUTH_USER_KEY)).toBe(JSON.stringify(updatedUser));
      expect(sessionStorage.getItem('access_token')).toBe('existing-access-token');
    });

    it('does not persist when there is no access token yet', async () => {
      const store = buildStore({
        loading: false,
        error: null,
        accessToken: null,
        refreshToken: null,
        user: null,
      });

      vi.mocked(api.get).mockResolvedValue({ data: { user } });

      await store.dispatch(fetchCurrentUser());

      expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
    });
  });

  describe('deleteAccount', () => {
    it('sends { confirm, currentPassword, reason } to DELETE /auth/account (matching the API contract)', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { message: 'deleted' } });

      const store = buildStore();
      await store.dispatch(
        deleteAccount({ confirm: true, currentPassword: 'secret123', reason: 'no longer needed' }),
      );

      expect(api.delete).toHaveBeenCalledWith('/auth/account', {
        data: { confirm: true, currentPassword: 'secret123', reason: 'no longer needed' },
      });
    });

    it('always sends confirm: true even without a password (OTP-only/OAuth-only accounts)', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { message: 'deleted' } });

      const store = buildStore();
      await store.dispatch(deleteAccount({ confirm: true }));

      expect(api.delete).toHaveBeenCalledWith('/auth/account', {
        data: { confirm: true, currentPassword: undefined, reason: undefined },
      });
    });
  });

  describe('resetAuthState', () => {
    it('clears tokens, user, and error, and wipes the persisted session', () => {
      sessionStorage.setItem('access_token', 'stale-access-token');
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

      const store = buildStore({
        loading: false,
        error: 'some previous error',
        accessToken: 'stale-access-token',
        refreshToken: 'stale-refresh-token',
        user,
      });

      store.dispatch(resetAuthState());

      const state = store.getState().auth;
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
      expect(sessionStorage.getItem('access_token')).toBeNull();
      expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
    });
  });
});
