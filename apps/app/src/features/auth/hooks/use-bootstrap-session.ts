'use client';

import { useEffect } from 'react';

import { fetchCurrentUser } from '../store/auth-slice';
import { useAppDispatch } from './index';

/**
 * Resolves the session against the backend once on every app load. Neither session token
 * is ever readable from this app's code (both are HttpOnly cookies), so "authenticated"
 * can only be known by asking the API — this call fails closed to 'unauthenticated' if
 * there's no valid cookie. Unconditional on purpose: redux-persist may rehydrate a stale
 * `status: 'authenticated'` from a previous session whose cookie has since expired, so
 * that value can never be trusted without re-checking it here.
 */
export function useBootstrapSession() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
