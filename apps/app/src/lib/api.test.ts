import axios, { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { clearAuthSession } from './auth';
import { notifyAuthFailure } from './auth-events';

vi.mock('./auth', () => ({
  clearAuthSession: vi.fn(),
}));

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

  it('rotates both cookies via a bodyless refresh call, then retries the original request', async () => {
    // The raw axios.post(...) refresh call bypasses `api`'s interceptors by design (see
    // api.ts) — it goes through the global default axios instance instead. Neither token
    // is in the request or the response: both cookies are rotated by the API's own
    // Set-Cookie header, invisible to this code.
    axios.defaults.adapter = async (config) => {
      expect(config.url).toContain('/auth/refresh');
      expect(config.data).toBeUndefined();
      expect(config.withCredentials).toBe(true);
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    let attempt = 0;
    api.defaults.adapter = async (config) => {
      attempt += 1;
      if (attempt === 1) {
        throw fakeAxiosError(config as never);
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const response = await api.get('/protected');

    expect(response.data).toEqual({ ok: true });
    expect(attempt).toBe(2);
  });

  it('deduplicates concurrent refreshes into a single call (single-flight)', async () => {
    let refreshCalls = 0;
    axios.defaults.adapter = async (config) => {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
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

    // clearAuthSession() alone only clears the cached user in sessionStorage — Redux
    // state must be reset separately, via the notifyAuthFailure indirection (see
    // lib/auth-events.ts), or the UI would keep rendering as authenticated.
    expect(clearAuthSession).toHaveBeenCalled();
    expect(notifyAuthFailure).toHaveBeenCalled();
  });
});
