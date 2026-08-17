'use client';

import { refreshSession } from '@/lib/api';
import { useEffect, useRef } from 'react';

import { selectAuth } from '../store/auth-slice';
import { useAppSelector } from './index';

/**
 * Periodically and opportunistically refreshes the member session in the background
 * while the user is authenticated.
 *
 * This keeps the short-lived `access_token` cookie perpetually fresh in the browser
 * so that Next.js server-side route guards (edge proxy.ts and RSC DashboardLayout)
 * never encounter an expired cookie during page navigation.
 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_VISIBILITY_REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export function useProactiveRefresh() {
  const { isAuthenticated } = useAppSelector(selectAuth);
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (lastRefreshRef.current === 0) {
      lastRefreshRef.current = Date.now();
    }

    const performSilentRefresh = async () => {
      try {
        await refreshSession();
        lastRefreshRef.current = Date.now();
      } catch {
        // Ignored: Axios interceptor already handles notifyAuthFailure if refresh token is genuinely invalid
      }
    };

    // Periodic background timer
    const interval = setInterval(() => {
      void performSilentRefresh();
    }, REFRESH_INTERVAL_MS);

    // Refresh when user returns to an idle tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshRef.current;
        if (elapsed > MIN_VISIBILITY_REFRESH_INTERVAL_MS) {
          void performSilentRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);
}
