'use client';

import { useMatchingRealtime } from '../hooks/use-matching-realtime';

/** Mount once under the authenticated app shell to keep match lists live. */
export function MatchingRealtimeBridge() {
  useMatchingRealtime(true);
  return null;
}
