import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { clearAuthSession } from './auth';
import { notifyAuthFailure } from './auth-events';
import { captureMobileTokensFromBody, mobileTokenStorage } from './mobile-tokens';
import { getMobileAuthHeaders, isNativeMobileClient } from './native';

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
  const native = isNativeMobileClient();
  const refreshToken = native ? mobileTokenStorage.getRefresh() : null;
  const mobileHeaders = native ? await getMobileAuthHeaders() : {};

  // Web: no body — refresh travels as HttpOnly cookie (utils/member-session.ts).
  // Cap: body refreshToken + mobile client label/secret so the API returns rotated JWTs.
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
    native && refreshToken ? { refreshToken } : undefined,
    {
      withCredentials: true,
      headers: {
        ...mobileHeaders,
        ...(native && refreshToken
          ? { Authorization: `Bearer ${mobileTokenStorage.getAccess()}` }
          : {}),
      },
    },
  );

  if (native) {
    captureMobileTokensFromBody(response.data);
  }
}

api.interceptors.request.use(async (config) => {
  if (!isNativeMobileClient()) return config;

  const mobileHeaders = await getMobileAuthHeaders();
  for (const [key, value] of Object.entries(mobileHeaders)) {
    config.headers.set(key, value);
  }
  const access = mobileTokenStorage.getAccess();
  if (access) {
    config.headers.set('Authorization', `Bearer ${access}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    captureMobileTokensFromBody(response.data);
    return response;
  },
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

      if (isNativeMobileClient()) {
        const access = mobileTokenStorage.getAccess();
        if (access) {
          config.headers.set('Authorization', `Bearer ${access}`);
        }
      }

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

/** Map Axios / Fastify errors to stable i18n message keys. */
export function apiErrorKey(error: unknown, fallback = 'common.errors.generic'): string {
  if (!axios.isAxiosError(error)) return fallback;
  const status = error.response?.status;
  const message = String(
    (error.response?.data as { message?: string; error?: string } | undefined)?.message ||
      (error.response?.data as { error?: string } | undefined)?.error ||
      '',
  ).toLowerCase();
  if (status === 401) return 'common.errors.unauthorized';
  if (status === 403) return 'common.errors.forbidden';
  if (status === 404) return 'common.errors.notFound';
  if (status === 409) return 'common.errors.conflict';
  if (status === 429 || message.includes('limit') || message.includes('quota')) {
    return 'matching.errors.quotaExceeded';
  }
  if (status && status >= 500) return 'common.errors.server';
  return fallback;
}
