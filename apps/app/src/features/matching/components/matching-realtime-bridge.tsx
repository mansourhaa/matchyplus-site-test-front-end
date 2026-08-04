'use client';

import { MessagingSendErrorToaster } from '@/features/messaging/components/messaging-send-error-toaster';

import { useMatchingRealtime } from '../hooks/use-matching-realtime';

/** Mount once under the authenticated app shell to keep match lists live. */
export function MatchingRealtimeBridge() {
  useMatchingRealtime(true);
  return <MessagingSendErrorToaster />;
}
