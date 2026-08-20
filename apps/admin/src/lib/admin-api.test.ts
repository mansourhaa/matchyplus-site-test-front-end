import axios, { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminApi } from './admin-api';
import { clearAdminSession, refreshAdminSessionMarker } from './admin-auth';

vi.mock('./admin-auth', () => ({
  clearAdminSession: vi.fn(),
  refreshAdminSessionMarker: vi.fn(),
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

describe('adminApi response interceptor', () => {
  const originalGlobalAdapter = axios.defaults.adapter;
  const originalAdminApiAdapter = adminApi.defaults.adapter;
  const originalLocation = window.location;

  afterEach(() => {
    axios.defaults.adapter = originalGlobalAdapter;
    adminApi.defaults.adapter = originalAdminApiAdapter;
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.clearAllMocks();
  });

  it('refreshes via cookie, then retries the original request', async () => {
    // The refresh call bypasses adminApi's own interceptors by going through the global
    // default axios instance (same reasoning as apps/app's api.ts) — no token in the
    // request or response, both cookies are rotated by the API's Set-Cookie header alone.
    axios.defaults.adapter = async (config) => {
      expect(config.url).toContain('/auth/admin/refresh');
      expect(config.withCredentials).toBe(true);
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    let attempt = 0;
    adminApi.defaults.adapter = async (config) => {
      attempt += 1;
      if (attempt === 1) {
        throw fakeAxiosError(config as never);
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const response = await adminApi.get('/admin/users');

    expect(response.data).toEqual({ ok: true });
    expect(attempt).toBe(2);
    expect(clearAdminSession).not.toHaveBeenCalled();
    // proxy.ts gates every navigation on the readable marker, not the HttpOnly cookie it
    // can't see — the marker's own expiry has to be pushed forward on every refresh too.
    expect(refreshAdminSessionMarker).toHaveBeenCalled();
  });

  it('deduplicates concurrent refreshes into a single call (single-flight)', async () => {
    let refreshCalls = 0;
    axios.defaults.adapter = async (config) => {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    adminApi.defaults.adapter = async (config) => {
      if (!(config as { _retried?: boolean })._retried) {
        throw fakeAxiosError(config as never);
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await Promise.all([adminApi.get('/a'), adminApi.get('/b')]);

    expect(refreshCalls).toBe(1);
  });

  it('clears the session and redirects to login when the refresh call itself fails', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: '/admin', href: '' },
    });

    axios.defaults.adapter = async (config) => {
      throw fakeAxiosError(config as never);
    };
    adminApi.defaults.adapter = async (config) => {
      throw fakeAxiosError(config as never);
    };

    await expect(adminApi.get('/admin/users')).rejects.toBeTruthy();

    expect(clearAdminSession).toHaveBeenCalled();
    expect(window.location.href).toBe('/admin/login');
  });

  it('does not attempt a refresh loop when the failing request is the refresh call itself', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: '/admin', href: '' },
    });

    let refreshAttempts = 0;
    adminApi.defaults.adapter = async (config) => {
      if (String(config.url).includes('/auth/admin/refresh')) {
        refreshAttempts += 1;
      }
      throw fakeAxiosError(config as never);
    };

    await expect(adminApi.post('/auth/admin/refresh')).rejects.toBeTruthy();

    expect(refreshAttempts).toBe(1);
    expect(clearAdminSession).toHaveBeenCalled();
  });
});
