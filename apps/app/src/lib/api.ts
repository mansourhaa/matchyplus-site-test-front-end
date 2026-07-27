import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { clearAuthSession } from './auth';
import { notifyAuthFailure } from './auth-events';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// The API always answers an error with { status, code, message } (see
// routes/v1/auth/actions.ts's mapError) — `code` is the stable identifier callers should
// branch on, `message` is only a fallback for whatever didn't get a dedicated UI string.
export function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { code?: string } | undefined)?.code;
  }
  return undefined;
}

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  // No body: the refresh token travels as its own HttpOnly cookie (see
  // utils/member-session.ts on the API) — this call just asks the API to rotate both
  // cookies, which it does via Set-Cookie on the response.
  await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, undefined, {
    withCredentials: true,
  });
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
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;

      return api(config);
    } catch {
      clearAuthSession();
      // clearAuthSession() only clears the cached user in sessionStorage — the Redux auth
      // state (and its own redux-persist copy) is untouched by that alone, so without this
      // the UI would keep rendering as authenticated until the next reload.
      notifyAuthFailure();
      return Promise.reject(error);
    }
  },
);
