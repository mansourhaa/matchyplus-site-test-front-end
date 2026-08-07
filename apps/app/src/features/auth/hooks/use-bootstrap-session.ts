'use client';

import { syncMirroredAccessCookieFromStorage } from '@/lib/mobile-tokens';
import { useEffect } from 'react';

import { fetchCurrentUser } from '../store/auth-slice';
import { useAppDispatch } from './index';

/**
 * Resolves the session against the backend once on every app load. Neither session token
 * is ever readable from this app's code on web (both are HttpOnly cookies), so
 * "authenticated" can only be known by asking the API — this call fails closed to
 * 'unauthenticated' if there's no valid cookie. Unconditional on purpose: redux-persist
 * may rehydrate a stale `status: 'authenticated'` from a previous session whose cookie
 * has since expired, so that value can never be trusted without re-checking it here.
 *
 * On Capacitor, Bearer JWTs live in localStorage while the mirrored app-origin cookie
 * used by proxy.ts may be gone after a cold WebView restart — re-sync that cookie first
 * so protected navigations are not bounced to /login before authcheck runs.
 */
export function useBootstrapSession() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    syncMirroredAccessCookieFromStorage();
    dispatch(fetchCurrentUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
