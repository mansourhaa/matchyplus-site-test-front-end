import axios, { InternalAxiosRequestConfig } from 'axios';

import { clearAdminSession, refreshAdminSessionMarker } from './admin-auth';

/**
 * Separate from `api` because every admin route is behind `verifyToken` + `verifyAdmin`
 * and must carry the admin session rather than the regular user one. That session is an
 * HttpOnly cookie the browser replays by itself, so there is no token to read here and put
 * in an Authorization header — which is exactly the point.
 */
export const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<void> | null = null;

/** Browser-only (the admin panel has no Capacitor client) — cookie-in, cookies-out. */
export async function refreshAdminSession(): Promise<void> {
  await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/refresh`,
    {},
    { withCredentials: true },
  );
  refreshAdminSessionMarker();
}

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryableRequestConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isRefreshCall = config?.url?.includes('/auth/admin/refresh');

    if (!config || !isUnauthorized || isRefreshCall || config._retried) {
      if (isUnauthorized && typeof window !== 'undefined') {
        clearAdminSession();
        if (window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      }
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      refreshPromise ??= refreshAdminSession().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return adminApi(config);
    } catch {
      // The refresh token itself is gone or expired — there is no recovery short of a
      // real login, same as the member app's reactive-refresh failure path.
      if (typeof window !== 'undefined') {
        clearAdminSession();
        if (window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      }
      return Promise.reject(error);
    }
  },
);
