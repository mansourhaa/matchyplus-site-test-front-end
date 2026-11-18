import { api } from '@/lib/api';
import { AUTH_USER_KEY } from '@/lib/auth';
import { mobileTokenStorage } from '@/lib/mobile-tokens';
import * as native from '@/lib/native';
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
  verified: false,
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
    vi.restoreAllMocks();
  });

  describe('registerPhone', () => {
    it('sends { phone, signupToken, name } to /auth/register-phone, no tokens are ever in the response', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { user } });

      const store = buildStore();
      await store.dispatch(
        registerPhone({
          phone: '+21612345678',
          signupToken: 'valid-grant-token',
          name: 'Jane Doe',
        }),
      );

      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', {
        phone: '+21612345678',
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
      await store.dispatch(loginPhone({ phone: '+21612345678', code: '123456' }));

      expect(store.getState().auth.status).toBe('authenticated');
      expect(store.getState().auth.sessionChecked).toBe(true);
    });

    it('rejects Cap logins missing body JWTs, clears tokens, and logs out cookies', async () => {
      vi.spyOn(native, 'isNativeMobileClient').mockReturnValue(true);
      const clearSpy = vi.spyOn(mobileTokenStorage, 'clear');
      vi.mocked(api.post).mockImplementation(async (url: string) => {
        if (url === '/auth/login-phone') return { data: { user } };
        if (url === '/auth/logout') return { data: { code: 'logout_successful' } };
        throw new Error(`Unexpected URL ${url}`);
      });

      const store = buildStore();
      const result = await store.dispatch(
        loginPhone({ phone: '+21612345678', code: '123456' }),
      );

      expect(result.meta.requestStatus).toBe('rejected');
      expect(result).toMatchObject({ error: { message: 'mobile_session_unavailable' } });
      expect(clearSpy).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      expect(store.getState().auth.status).not.toBe('authenticated');
    });

    it('rejects Cap logins that return accessToken without refreshToken', async () => {
      vi.spyOn(native, 'isNativeMobileClient').mockReturnValue(true);
      vi.mocked(api.post).mockImplementation(async (url: string) => {
        if (url === '/auth/login-phone') {
          return { data: { user, accessToken: 'access-only' } };
        }
        if (url === '/auth/logout') return { data: { code: 'logout_successful' } };
        throw new Error(`Unexpected URL ${url}`);
      });

      const result = await buildStore().dispatch(
        loginPhone({ phone: '+21612345678', code: '123456' }),
      );

      expect(result.meta.requestStatus).toBe('rejected');
      expect(result).toMatchObject({ error: { message: 'mobile_session_unavailable' } });
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

    it('rejects Cap OAuth exchanges missing body JWTs and logs out', async () => {
      vi.spyOn(native, 'isNativeMobileClient').mockReturnValue(true);
      vi.mocked(api.post).mockImplementation(async (url: string) => {
        if (url === '/auth/oauth/exchange') return { data: { user } };
        if (url === '/auth/logout') return { data: { code: 'logout_successful' } };
        throw new Error(`Unexpected URL ${url}`);
      });

      const result = await buildStore().dispatch(exchangeOAuthCode({ code: 'oauth-code' }));

      expect(result.meta.requestStatus).toBe('rejected');
      expect(result).toMatchObject({ error: { message: 'mobile_session_unavailable' } });
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
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

    it('does not clear a session established by registerPhone while this bootstrap check was still in flight', async () => {
      // useBootstrapSession fires fetchCurrentUser on every page load, unconditionally,
      // before it's known whether a cookie even exists — on /register, a fresh visitor
      // can finish phone signup (registerPhone) before that request resolves. A late 401
      // correctly reflects the pre-signup state, but must not clear the session signup
      // just established.
      let resolveGet!: (value: unknown) => void;
      vi.mocked(api.get).mockReturnValue(
        new Promise((_resolve, reject) => {
          resolveGet = reject;
        }),
      );
      const store = buildStore({ status: 'unknown', loading: false, error: null, user: null });

      const pendingFetch = store.dispatch(fetchCurrentUser());

      // registerPhone completes first, establishing a real session.
      vi.mocked(api.post).mockResolvedValue({ data: { user } });
      await store.dispatch(
        registerPhone({ phone: '+21612345678', signupToken: 'grant' }),
      );
      expect(store.getState().auth.status).toBe('authenticated');

      // The stale bootstrap authcheck finally rejects (401, reflecting the pre-signup
      // cookie state).
      resolveGet(new Error('401'));
      await pendingFetch;

      expect(store.getState().auth.status).toBe('authenticated');
      expect(store.getState().auth.user).toEqual(user);
    });

    it('does not apply a stale fulfilled authcheck either, once a newer session has been established', async () => {
      let resolveGet!: (value: unknown) => void;
      vi.mocked(api.get).mockReturnValue(
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
      );
      const store = buildStore({ status: 'unknown', loading: false, error: null, user: null });

      const pendingFetch = store.dispatch(fetchCurrentUser());

      const newerUser: AuthUser = { ...user, id: 'user-2', name: 'Someone Else' };
      vi.mocked(api.post).mockResolvedValue({ data: { user: newerUser } });
      await store.dispatch(
        registerPhone({ phone: '+21699999999', signupToken: 'grant' }),
      );

      // The stale bootstrap authcheck finally resolves with the OLD (pre-signup) user.
      resolveGet({ data: { user } });
      await pendingFetch;

      expect(store.getState().auth.user).toEqual(newerUser);
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
