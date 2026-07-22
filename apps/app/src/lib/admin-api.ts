import axios from 'axios';

import { clearAdminSession } from './admin-auth';

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
