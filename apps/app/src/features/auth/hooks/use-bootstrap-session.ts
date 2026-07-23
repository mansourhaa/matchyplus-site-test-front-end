'use client';

import { useEffect } from 'react';

import { fetchCurrentUser, selectAuth } from '../store/auth-slice';
import { useAppDispatch, useAppSelector } from './index';

/**
 * Re-validates the persisted session against the backend once on app load — the access
 * token carried over by redux-persist may be stale/expired, and this both confirms it's
 * still valid and refreshes the user's fields (phone, auth_provider, email_verified, ...).
 * Runs once at mount only: a fresh login/OTP-verify already returns the user in its own
 * response, so there's no need to immediately re-fetch after those.
 */
export function useBootstrapSession() {
  const dispatch = useAppDispatch();
  const { accessToken } = useAppSelector(selectAuth);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchCurrentUser());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
