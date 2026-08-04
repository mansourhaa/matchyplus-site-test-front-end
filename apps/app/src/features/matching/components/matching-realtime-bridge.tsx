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
 */
export function MatchingRealtimeBridge() {
  const { isAuthenticated } = useAppSelector(selectAuth);
  const { pushToasts } = useMatchingRealtime(isAuthenticated);
  return (
    <>
      <MessagingSendErrorToaster />
      <RealtimePushToastStack items={pushToasts} />
    </>
  );
}
