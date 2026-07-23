import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { clearAuthSession, getAccessToken, getRefreshToken, setAccessToken } from './auth';

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

  const response = await axios.post<{ access_token: string }>(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
    { refresh_token: refreshToken },
  );

  const accessToken = response.data.access_token;
  setAccessToken(accessToken);
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
      return Promise.reject(error);
    }
  },
);
