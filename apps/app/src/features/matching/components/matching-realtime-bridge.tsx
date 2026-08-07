'use client';

import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { MessagingSendErrorToaster } from '@/features/messaging/components/messaging-send-error-toaster';

import { useMatchingRealtime } from '../hooks/use-matching-realtime';
import { RealtimePushToastStack } from './realtime-push-toast-stack';

/**
 * Mounted once at the app root (ClientProvider wraps every route, including /login and
 * an unauthenticated /onboarding), so the socket itself must gate on session state —
 * without this, a logged-out visitor would open /realtime, fail auth, and reconnect
 * every ~3s for as long as they sit on a public page.
 *
 * Gating on `isAuthenticated` alone isn't enough: redux-persist can rehydrate a stale
 * `status: 'authenticated'` from a previous session before useBootstrapSession's
 * fetchCurrentUser call has actually confirmed the cookie is still valid. Also requiring
 * `sessionChecked` (set once that check settles, either way) closes that window — an
 * expired persisted session no longer opens-fails-reconnects until the check clears it.
 */
export function MatchingRealtimeBridge() {
  const { isAuthenticated, sessionChecked } = useAppSelector(selectAuth);
  const { pushToasts } = useMatchingRealtime(isAuthenticated && sessionChecked);
  return (
    <>
      <MessagingSendErrorToaster />
      <RealtimePushToastStack items={pushToasts} />
    </>
  );
}
