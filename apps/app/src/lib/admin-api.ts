import axios from 'axios';

import { ADMIN_AUTH_TOKEN_KEY, clearAdminSession } from './admin-auth';

/**
 * Separate from `api` because every admin route is behind `verifyToken` + `verifyAdmin`
 * and must carry the admin session token rather than the regular user one.
 */
export const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

adminApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem(ADMIN_AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 means the admin session is no longer valid (expired, or the account changed),
    // so drop it and send the admin back to the login rather than showing an error banner.
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      clearAdminSession();
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);
