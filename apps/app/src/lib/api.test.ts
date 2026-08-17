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

  it('rotates both cookies via an empty-object refresh call, then retries the original request', async () => {
    // The raw axios.post(...) refresh call bypasses `api`'s interceptors by design (see
    // api.ts) — it goes through the global default axios instance instead. Neither token
    // is in the request or the response: both cookies are rotated by the API's own
    // Set-Cookie header, invisible to this code. Body is `{}` (not undefined) so Fastify
    // accepts application/json without FST_ERR_CTP_EMPTY_JSON_BODY.
    axios.defaults.adapter = async (config) => {
      expect(config.url).toContain('/auth/refresh');
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      expect(body).toEqual({});
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

  it('refreshes session via cookie and retries when authcheck fails with 401 on web', async () => {
    let refreshCalls = 0;
    axios.defaults.adapter = async () => {
      refreshCalls += 1;
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
    };

    let attempt = 0;
    api.defaults.adapter = async (config) => {
      attempt += 1;
      if (attempt === 1) {
        const error = fakeAxiosError(config as never);
        error.response!.data = { status: 401, message: 'entity-not-found' };
        throw error;
      }
      return {
        data: { user: { id: 'user-1' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const response = await api.get('/auth/authcheck');
    expect(refreshCalls).toBe(1);
    expect(response.data).toEqual({ user: { id: 'user-1' } });
  });
});
