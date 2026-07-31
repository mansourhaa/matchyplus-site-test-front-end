'use client';

import { MessagingSendErrorToaster } from '@/features/messaging/components/messaging-send-error-toaster';

import { useMatchingRealtime } from '../hooks/use-matching-realtime';
import { RealtimePushToastStack } from './realtime-push-toast-stack';

/** Mount once under the authenticated app shell to keep match lists live. */
export function MatchingRealtimeBridge() {
  const { pushToasts } = useMatchingRealtime(true);
  return (
    <>
      <MessagingSendErrorToaster />
      <RealtimePushToastStack items={pushToasts} />
    </>
  );
}
