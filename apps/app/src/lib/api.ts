import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './auth';
import { notifyAuthFailure } from './auth-events';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // The API rotates refresh tokens on every use — the presented one is revoked
  // server-side and a new one issued in the same response — so both the new access
  // and refresh tokens must be persisted, or the next refresh would be attempted with
  // an already-revoked token.
  const response = await axios.post<{ access_token: string; refresh_token: string }>(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
    { refresh_token: refreshToken },
  );

  const { access_token: accessToken, refresh_token: newRefreshToken } = response.data;
  setAccessToken(accessToken);
  if (newRefreshToken) {
    setRefreshToken(newRefreshToken);
  }
  return accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isRefreshCall = config?.url?.includes('/auth/refresh');

    if (!config || !isUnauthorized || isRefreshCall || config._retried) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const accessToken = await refreshPromise;

      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch {
      clearAuthSession();
      // clearAuthSession() only clears sessionStorage/cookie — the Redux auth state
      // (and its own redux-persist copy) is untouched by that alone, so without this
      // the UI would keep rendering as authenticated until the next reload.
      notifyAuthFailure();
      return Promise.reject(error);
    }
  },
);
