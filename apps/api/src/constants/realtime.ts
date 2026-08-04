import { randomUUID } from 'node:crypto';

/** Redis Streams key for cross-instance WebSocket fan-out. */
export const REALTIME_STREAM_KEY_DEFAULT = 'realtime:events';

/** Consumer group prefix; each API instance uses `realtime:inst:{INSTANCE_ID}`. */
export const REALTIME_GROUP_PREFIX = 'realtime:inst:';

/**
 * New consumer groups start at `0` so a pod that finished bootstrap late still
 * sees peer events published while it was retrying. Historical client replay is
 * prevented in the fan-out handler by skipping entries older than process start.
 */
export const REALTIME_CONSUMER_GROUP_START_ID = '0';

/**
 * Approximate stream retention for XADD MINID ~ (ms).
 * Late bootstrap can still catch peer publishes within this window; older
 * entries are trimmed so the stream stays bounded.
 */
export const REALTIME_STREAM_RETENTION_MS = 30 * 60 * 1000;

/** Ignore stream entries older than process start minus this grace (clock skew). */
export const REALTIME_CATCH_UP_GRACE_MS = 5_000;

export function realtimeStreamKey(): string {
  return process.env.REALTIME_STREAM_KEY?.trim() || REALTIME_STREAM_KEY_DEFAULT;
}

/**
 * Unique id for this API process’s consumer group.
 * Staging/prod must set a **distinct** value per replica (e.g. Kubernetes pod name).
 * Reusing the same INSTANCE_ID across pods makes them share one consumer group, so
 * Redis load-balances entries and peers on other pods miss events.
 * Default random UUID is fine for single-instance / local when historical
 * deliveries are filtered by process start time.
 */
export function realtimeInstanceId(): string {
  return process.env.INSTANCE_ID?.trim() || randomUUID();
}

export function realtimeConsumerGroup(instanceId: string): string {
  return `${REALTIME_GROUP_PREFIX}${instanceId}`;
}

/** Max inbound WebSocket client frame size (bytes). */
export const REALTIME_MAX_INBOUND_BYTES = 8_192;

/** Min interval between typing emits per user+conversation (`stop_typing` is never throttled). */
export const REALTIME_TYPING_MIN_INTERVAL_MS = 750;

/** Client/server idle keepalive interval (ms). Keep in sync with the app hook. */
export const REALTIME_PING_INTERVAL_MS = 25_000;

/** Whether an inbound typing frame should be dropped by the throttle. */
export function shouldThrottleTypingEvent(
  event: 'typing' | 'stop_typing',
  lastEmitMs: number,
  nowMs: number,
  intervalMs = REALTIME_TYPING_MIN_INTERVAL_MS,
): boolean {
  if (event === 'stop_typing') return false;
  return nowMs - lastEmitMs < intervalMs;
}
