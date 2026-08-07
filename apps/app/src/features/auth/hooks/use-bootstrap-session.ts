'use client';

import {
  hydrateMobileTokenStorage,
  mobileTokenStorage,
  syncMirroredAccessCookieFromStorage,
} from '@/lib/mobile-tokens';
import { isNativeMobileClient } from '@/lib/native';
import { skipsBootstrapAuthCheck } from '@/lib/route-auth';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { acknowledgeAnonymousBootstrap, fetchCurrentUser } from '../store/auth-slice';
import { useAppDispatch } from './index';

/**
 * Survives React Strict Mode's double effect invoke so `/auth/authcheck` is not
 * fired twice on a single document load. Reset in tests via
 * `resetBootstrapSessionLatchForTests`.
 */
let bootstrapStarted = false;

/** Test helper — allow a fresh bootstrap after remounting providers. */
export function resetBootstrapSessionLatchForTests() {
  bootstrapStarted = false;
}

/**
 * Resolves the session against the backend once per document load on routes that
 * need it. HttpOnly cookies are not readable from JS, so "authenticated" is only
 * known by asking the API — except on public auth surfaces (`/login`,
 * `/oauth-callback`, …) where a probe is useless noise (and Cap cold-start with
 * Preferences tokens still probes).
 *
 * redux-persist may rehydrate a stale `status: 'authenticated'`; public-route
 * bootstrap clears that locally, and protected-route bootstrap re-checks via
 * authcheck.
 */
export function useBootstrapSession() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  useEffect(() => {
    if (bootstrapStarted) return;
    bootstrapStarted = true;

    void (async () => {
      await hydrateMobileTokenStorage();
      syncMirroredAccessCookieFromStorage();

      const capHasToken = isNativeMobileClient() && Boolean(mobileTokenStorage.getAccess());
      if (skipsBootstrapAuthCheck(pathname) && !capHasToken) {
        dispatch(acknowledgeAnonymousBootstrap());
        return;
      }

      dispatch(fetchCurrentUser());
    })();
  }, [dispatch, pathname]);
}
