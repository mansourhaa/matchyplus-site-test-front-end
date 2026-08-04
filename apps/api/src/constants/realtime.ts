import { randomUUID } from 'node:crypto';

/** Redis Streams key for cross-instance WebSocket fan-out. */
export const REALTIME_STREAM_KEY_DEFAULT = 'realtime:events';

/** Consumer group prefix; each API instance uses `realtime:inst:{INSTANCE_ID}`. */
export const REALTIME_GROUP_PREFIX = 'realtime:inst:';

export function realtimeStreamKey(): string {
  return process.env.REALTIME_STREAM_KEY?.trim() || REALTIME_STREAM_KEY_DEFAULT;
}

export function realtimeInstanceId(): string {
  return process.env.INSTANCE_ID?.trim() || randomUUID();
}

export function realtimeConsumerGroup(instanceId: string): string {
  return `${REALTIME_GROUP_PREFIX}${instanceId}`;
}

/** Max inbound WebSocket client frame size (bytes). */
export const REALTIME_MAX_INBOUND_BYTES = 8_192;

/** Min interval between typing/stop_typing emits per user+conversation. */
export const REALTIME_TYPING_MIN_INTERVAL_MS = 750;

/** Client/server idle keepalive interval (ms). */
export const REALTIME_PING_INTERVAL_MS = 25_000;
