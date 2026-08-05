import { api } from '@/lib/api';
import { AUTH_USER_KEY } from '@/lib/auth';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../types';
import authReducer, {
  deleteAccount,
  exchangeOAuthCode,
  fetchCurrentUser,
  loginPhone,
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
  onboarding_completed: false,
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
    it('sends { phone, password, signupToken, name } to /auth/register-phone, no tokens are ever in the response', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { user } });

      const store = buildStore();
      await store.dispatch(
        registerPhone({
          phone: '+21612345678',
          password: 'secret123',
          signupToken: 'valid-grant-token',
          name: 'Jane Doe',
        }),
      );

      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', {
        phone: '+21612345678',
        password: 'secret123',
        signupToken: 'valid-grant-token',
        name: 'Jane Doe',
      });
      expect(store.getState().auth.user).toEqual(user);
      expect(store.getState().auth.status).toBe('authenticated');
      // A successful interactive registration is just as valid a "session confirmed"
      // signal as the bootstrap authcheck — code gating on sessionChecked (e.g. the
      // realtime bridge) must not stay blocked waiting on that unrelated request too.
      expect(store.getState().auth.sessionChecked).toBe(true);
    });
  });

  describe('loginPhone', () => {
    it('sets sessionChecked on success, same as a successful authcheck', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { user } });

      const store = buildStore();
      await store.dispatch(loginPhone({ phone: '+21612345678', password: 'secret123' }));

      expect(store.getState().auth.status).toBe('authenticated');
      expect(store.getState().auth.sessionChecked).toBe(true);
    });
  });

  describe('exchangeOAuthCode', () => {
    it('sets sessionChecked on success, same as a successful authcheck', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { user } });

      const store = buildStore();
      await store.dispatch(exchangeOAuthCode({ code: 'oauth-code' }));

      expect(store.getState().auth.status).toBe('authenticated');
      expect(store.getState().auth.sessionChecked).toBe(true);
    });
  });

  describe('fetchCurrentUser', () => {
    it('marks the session authenticated and persists the user on success', async () => {
      const store = buildStore({ status: 'unknown', loading: false, error: null, user: null });

      vi.mocked(api.get).mockResolvedValue({ data: { user } });

      await store.dispatch(fetchCurrentUser());

      expect(store.getState().auth.status).toBe('authenticated');
      expect(store.getState().auth.user).toEqual(user);
      expect(sessionStorage.getItem(AUTH_USER_KEY)).toBe(JSON.stringify(user));
    });

    it('marks the session unauthenticated and clears the cache when there is no valid cookie', async () => {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      const store = buildStore({ status: 'unknown', loading: false, error: null, user });

      vi.mocked(api.get).mockRejectedValue(new Error('401'));

      await store.dispatch(fetchCurrentUser());

      expect(store.getState().auth.status).toBe('unauthenticated');
      expect(store.getState().auth.user).toBeNull();
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
    it('marks the session unauthenticated, clears the user and error, and wipes the cache', () => {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

      const store = buildStore({
        status: 'authenticated',
        loading: false,
        error: 'some previous error',
        user,
      });

      store.dispatch(resetAuthState());

      const state = store.getState().auth;
      expect(state.status).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
      expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
    });
  });
});
