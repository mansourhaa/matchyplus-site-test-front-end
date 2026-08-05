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

/**
 * Min idle time (ms) before `XAUTOCLAIM` reclaims PEL entries after a failed
 * deliver/ACK or process crash. Avoids tight retry spins on persistent failures.
 */
export const REALTIME_PEL_MIN_IDLE_MS = 5_000;

export function realtimeStreamKey(): string {
  return process.env.REALTIME_STREAM_KEY?.trim() || REALTIME_STREAM_KEY_DEFAULT;
}

export type RealtimeInstanceIdOptions = {
  /**
   * When true (Redis fan-out enabled), `INSTANCE_ID` must be set so restarts
   * keep the same consumer group and self-publishes stay skippable.
   */
  requireStable?: boolean;
};

/**
 * Unique id for this API process’s consumer group.
 * Must be **distinct** per replica (e.g. Kubernetes pod name). Reusing the same
 * INSTANCE_ID across pods makes them share one consumer group, so Redis
 * load-balances entries and peers on other pods miss events.
 * When Redis fan-out is on, `INSTANCE_ID` is required — a random UUID every boot
 * would replay recent self-publishes to reconnecting clients.
 *
 * Pod name via Downward API is unique per replica while the pod lives, but
 * **changes on restart**. Entries published by the previous pod within the
 * catch-up grace window may briefly redeliver to reconnecting clients (accepted
 * duplicate window; HTTP remains authoritative). Prefer StatefulSet ordinals or
 * a sticky id if that window must be zero.
 * Random UUID is only for in-process (no Redis) / unit tests.
 */
export function realtimeInstanceId(options: RealtimeInstanceIdOptions = {}): string {
  const id = process.env.INSTANCE_ID?.trim();
  if (id) return id;
  if (options.requireStable) {
    throw new Error(
      'INSTANCE_ID is required when Redis realtime fan-out is enabled (set a unique value per replica, e.g. the pod name)',
    );
  }
  return randomUUID();
}

export function realtimeConsumerGroup(instanceId: string): string {
  return `${REALTIME_GROUP_PREFIX}${instanceId}`;
}

/** Max inbound WebSocket client frame size (bytes). */
export const REALTIME_MAX_INBOUND_BYTES = 8_192;

/** Min interval between typing emits per user+conversation (`stop_typing` is never throttled). */
export const REALTIME_TYPING_MIN_INTERVAL_MS = 750;

/** Redis TTL for cross-replica typing holder counts (refreshed on typing activity). */
export const REALTIME_TYPING_HOLDER_TTL_SEC = 60;

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
