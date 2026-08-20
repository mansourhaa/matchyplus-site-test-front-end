'use client';

import { useAppSelector } from '@/features/auth/hooks';
import { refreshAdminSession } from '@/lib/admin-api';
import { hasAdminSessionMarker, refreshAdminSessionMarker } from '@/lib/admin-auth';
import { useEffect, useRef } from 'react';

import { selectAdminAuth } from '../store/admin-auth-slice';

/**
 * Mirrors the member app's useProactiveRefresh: the admin access token is short-lived
 * (ACCESS_TOKEN_TTL) and the edge middleware can only reject an expired cookie, never renew
 * it, so an idle-but-open panel would otherwise get bounced to /login mid-session. Refreshing
 * every 5 minutes plus on tab-visibility-regain keeps the cookie perpetually fresh for as
 * long as ADMIN_REFRESH_TOKEN_TTL allows.
 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_VISIBILITY_REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export function useAdminProactiveRefresh() {
  const { isAuthenticated } = useAppSelector(selectAdminAuth);
  const lastRefreshRef = useRef<number>(0);

  const shouldRefresh = isAuthenticated || hasAdminSessionMarker();

  useEffect(() => {
    if (!shouldRefresh) return;

    if (lastRefreshRef.current === 0) {
      lastRefreshRef.current = Date.now();
    }

    const performSilentRefresh = async () => {
      try {
        await refreshAdminSession();
        lastRefreshRef.current = Date.now();
      } catch {
        // Ignored: adminApi's interceptor already handles the redirect-to-login if the
        // refresh token is genuinely gone/expired.
      }
    };

    const interval = setInterval(() => {
      void performSilentRefresh();
    }, REFRESH_INTERVAL_MS);

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
  }, [shouldRefresh]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAdminSessionMarker();
    }
  }, [isAuthenticated]);
}
