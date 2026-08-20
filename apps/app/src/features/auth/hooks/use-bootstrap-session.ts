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
 * `resetBootstrapSessionLatchForTests`, and reset on Capacitor App resume / browser
 * tab-visibility-restore so a foreground-restore re-probes the session instead of
 * keeping stale redux-persist state.
 */
let bootstrapStarted = false;

/** Test helper — allow a fresh bootstrap after remounting providers. */
export function resetBootstrapSessionLatchForTests() {
  bootstrapStarted = false;
}

/**
 * Registers a one-time pair of event listeners that reset `bootstrapStarted` when the
 * app/tab returns to the foreground:
 *
 * - `resume`: Capacitor fires this on `window` when a native iOS/Android app returns
 *   from background. This is a plain DOM event — no `@capacitor/app` import required.
 * - `visibilitychange` → visible: covers browser tab restore and macOS app focus.
 *
 * Both paths reset the latch so the next `useBootstrapSession` render will re-dispatch
 * `fetchCurrentUser` and re-validate the session against the API.
 */
let foregroundListenersRegistered = false;

function registerForegroundListeners() {
  if (foregroundListenersRegistered || typeof window === 'undefined') return;
  foregroundListenersRegistered = true;

  // Capacitor dispatches a native 'resume' event on window when the iOS/Android app
  // returns from background — no plugin package needed.
  window.addEventListener('resume', () => {
    bootstrapStarted = false;
  });

  // Browser tab / PWA: visibilitychange covers tab-switch and app-focus restore.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      bootstrapStarted = false;
    }
  });
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
    // Wire up foreground restore listeners once, on first mount.
    registerForegroundListeners();

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
