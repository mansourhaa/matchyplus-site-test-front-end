import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
