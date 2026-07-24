import axios, { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { clearAuthSession, setAccessToken, setRefreshToken } from './auth';
import { notifyAuthFailure } from './auth-events';

vi.mock('./auth', () => {
  let accessToken = 'expired-access-token';
  let refreshToken = 'old-refresh-token';
  return {
    getAccessToken: vi.fn(() => accessToken),
    getRefreshToken: vi.fn(() => refreshToken),
    setAccessToken: vi.fn((token: string) => {
      accessToken = token;
    }),
    setRefreshToken: vi.fn((token: string) => {
      refreshToken = token;
    }),
    clearAuthSession: vi.fn(),
  };
});

vi.mock('./auth-events', () => ({
  notifyAuthFailure: vi.fn(),
}));

function fakeAxiosError(config: Record<string, unknown>): AxiosError {
  const error = new Error('Unauthorized') as AxiosError;
  error.config = config as never;
  error.response = {
    status: 401,
    data: {},
    statusText: 'Unauthorized',
    headers: {},
    config,
  } as never;
  error.isAxiosError = true;
  return error;
}

describe('api response interceptor', () => {
  const originalGlobalAdapter = axios.defaults.adapter;
  const originalApiAdapter = api.defaults.adapter;

  afterEach(() => {
    axios.defaults.adapter = originalGlobalAdapter;
    api.defaults.adapter = originalApiAdapter;
    vi.clearAllMocks();
  });

  it('rotates and persists both new tokens, then retries the original request', async () => {
    // The raw axios.post(...) refresh call bypasses `api`'s interceptors by design (see
    // api.ts) — it goes through the global default axios instance instead.
    axios.defaults.adapter = async (config) => {
      expect(config.url).toContain('/auth/refresh');
      return {
        data: { access_token: 'new-access-token', refresh_token: 'new-refresh-token' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    let attempt = 0;
    api.defaults.adapter = async (config) => {
      attempt += 1;
      if (attempt === 1) {
        throw fakeAxiosError(config as never);
      }
      // Retried request — should carry the rotated access token.
      expect((config.headers as Record<string, string>).Authorization).toBe(
        'Bearer new-access-token',
      );
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const response = await api.get('/protected');

    expect(response.data).toEqual({ ok: true });
    expect(setAccessToken).toHaveBeenCalledWith('new-access-token');
    expect(setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
    expect(attempt).toBe(2);
  });

  it('deduplicates concurrent refreshes into a single call (single-flight)', async () => {
    let refreshCalls = 0;
    axios.defaults.adapter = async (config) => {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        data: { access_token: 'new-access-token', refresh_token: 'new-refresh-token' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    api.defaults.adapter = async (config) => {
      if (!(config as { _retried?: boolean })._retried) {
        throw fakeAxiosError(config as never);
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await Promise.all([api.get('/a'), api.get('/b')]);

    expect(refreshCalls).toBe(1);
  });

  it('clears the session and notifies Redux when the refresh call itself fails', async () => {
    axios.defaults.adapter = async (config) => {
      throw fakeAxiosError(config as never);
    };

    api.defaults.adapter = async (config) => {
      throw fakeAxiosError(config as never);
    };

    await expect(api.get('/protected')).rejects.toBeTruthy();

    // clearAuthSession() alone only clears sessionStorage/cookie — Redux state must be
    // reset separately, via the notifyAuthFailure indirection (see lib/auth-events.ts),
    // or the UI would keep rendering as authenticated.
    expect(clearAuthSession).toHaveBeenCalled();
    expect(notifyAuthFailure).toHaveBeenCalled();
  });
});
