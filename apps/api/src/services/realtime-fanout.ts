import type { Redis } from 'ioredis';

import {
  REALTIME_CATCH_UP_GRACE_MS,
  REALTIME_CONSUMER_GROUP_START_ID,
  REALTIME_STREAM_RETENTION_MS,
  realtimeConsumerGroup,
  realtimeInstanceId,
  realtimeStreamKey,
} from '../constants/realtime.js';

export type RealtimeFanoutLogger = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
};

export type RealtimeDeliver = (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) => void;

export type RealtimeFanoutOptions = {
  redis: Redis | null;
  deliverLocal: RealtimeDeliver;
  log: RealtimeFanoutLogger;
  streamKey?: string;
  instanceId?: string;
  /** How long to retain stream entries (XADD MINID ~). */
  streamRetentionMs?: number;
  /** Process start time — entries with older `ts` are not delivered to clients. */
  startedAtMs?: number;
  /** Clock-skew grace before `startedAtMs` when filtering historical entries. */
  catchUpGraceMs?: number;
  /** Override for tests — skip starting the consumer loop. */
  startConsumer?: boolean;
  /** Backoff between bootstrap/read failures (ms). */
  retryDelayMs?: number;
};

/**
 * Local WebSocket deliver + Redis Streams fan-out for multi-instance APIs.
 * Each instance owns a consumer group so every node receives every event.
 */
export class RealtimeFanoutService {
  readonly instanceId: string;
  readonly streamKey: string;
  readonly consumerGroup: string;
  readonly streamRetentionMs: number;
  readonly startedAtMs: number;
  readonly catchUpGraceMs: number;

  private readonly redis: Redis | null;
  private readonly deliverLocal: RealtimeDeliver;
  private readonly log: RealtimeFanoutLogger;
  private readonly retryDelayMs: number;
  private reader: Redis | null = null;
  private stopped = false;
  private loopPromise: Promise<void> | null = null;

  constructor(options: RealtimeFanoutOptions) {
    this.redis = options.redis;
    this.deliverLocal = options.deliverLocal;
    this.log = options.log;
    this.streamKey = options.streamKey || realtimeStreamKey();
    this.instanceId = options.instanceId || realtimeInstanceId();
    this.consumerGroup = realtimeConsumerGroup(this.instanceId);
    this.streamRetentionMs = options.streamRetentionMs ?? REALTIME_STREAM_RETENTION_MS;
    this.startedAtMs = options.startedAtMs ?? Date.now();
    this.catchUpGraceMs = options.catchUpGraceMs ?? REALTIME_CATCH_UP_GRACE_MS;
    this.retryDelayMs = options.retryDelayMs ?? 1000;

    if (this.redis && options.startConsumer !== false) {
      this.loopPromise = this.startConsumerLoop();
    }
  }

  /** Start the consumer loop if it is not already running. */
  start(): void {
    if (!this.redis || this.loopPromise || this.stopped) return;
    this.loopPromise = this.startConsumerLoop();
  }

  /**
   * Deliver to sockets on this process, then publish for other instances.
   * Always XADDs when Redis is up — peers may be connected elsewhere.
   */
  notifyUser(userId: string, event: string, payload: Record<string, unknown>): void {
    this.deliverLocal(userId, event, payload);
    if (!this.redis) return;
    void this.publish(userId, event, payload).catch((err) => {
      this.log.error({ err, userId, event }, 'realtime stream publish failed');
    });
  }

  async publish(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.redis) return;
    const minId = `${Date.now() - this.streamRetentionMs}-0`;
    await this.redis.xadd(
      this.streamKey,
      'MINID',
      '~',
      minId,
      '*',
      'userId',
      userId,
      'event',
      event,
      'payload',
      JSON.stringify(payload ?? {}),
      'originInstanceId',
      this.instanceId,
      'ts',
      new Date().toISOString(),
    );
  }

  /**
   * Create this instance’s consumer group from the start of the retained stream
   * (`0`) so bootstrap retries still catch peer publishes. Client-facing
   * historical replay is filtered in `handleStreamEntry` via `startedAtMs`.
   */
  async ensureConsumerGroup(client: Redis = this.redis!): Promise<void> {
    try {
      await client.xgroup(
        'CREATE',
        this.streamKey,
        this.consumerGroup,
        REALTIME_CONSUMER_GROUP_START_ID,
        'MKSTREAM',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('BUSYGROUP')) throw err;
    }
  }

  /** Retry group ensure until success or `stop()` — used by the consumer loop. */
  async bootstrapConsumerGroup(client: Redis): Promise<boolean> {
    while (!this.stopped) {
      try {
        await this.ensureConsumerGroup(client);
        return true;
      } catch (err) {
        this.log.error({ err }, 'realtime stream bootstrap failed');
        await this.delay(this.retryDelayMs);
      }
    }
    return false;
  }

  /**
   * Apply a stream entry on this instance. Skips self-origin and entries older
   * than this process start (historical replay within the retained stream).
   * Uses `ts` when present; otherwise the Redis stream id’s millisecond prefix.
   */
  handleStreamEntry(fields: Record<string, string>, entryId?: string): void {
    const originInstanceId = fields.originInstanceId || '';
    if (originInstanceId === this.instanceId) return;

    const eventMs = RealtimeFanoutService.eventTimeMs(fields.ts, entryId);
    if (eventMs === null || eventMs < this.startedAtMs - this.catchUpGraceMs) {
      return;
    }

    const userId = fields.userId;
    const event = fields.event;
    if (!userId || !event) return;

    let payload: Record<string, unknown> = {};
    try {
      payload = fields.payload ? (JSON.parse(fields.payload) as Record<string, unknown>) : {};
    } catch {
      this.log.warn({ userId, event }, 'realtime stream payload JSON invalid');
      return;
    }

    this.deliverLocal(userId, event, payload);
  }

  /** Prefer ISO `ts` field; fall back to Redis stream id (`ms-seq`). */
  static eventTimeMs(ts: string | undefined, entryId?: string): number | null {
    if (ts) {
      const parsed = Date.parse(ts);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (entryId) {
      const msPart = Number(entryId.split('-')[0]);
      if (Number.isFinite(msPart)) return msPart;
    }
    return null;
  }

  static fieldsFromFlat(flat: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i + 1 < flat.length; i += 2) {
      out[flat[i]!] = flat[i + 1]!;
    }
    return out;
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reader) {
      try {
        this.reader.disconnect();
      } catch {
        // ignore
      }
      this.reader = null;
    }
    if (this.loopPromise) {
      await this.loopPromise.catch(() => undefined);
      this.loopPromise = null;
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  private async startConsumerLoop(): Promise<void> {
    if (!this.redis) return;

    this.reader = this.redis.duplicate();
    try {
      const ready = await this.bootstrapConsumerGroup(this.reader);
      if (!ready || this.stopped) return;

      this.log.info(
        {
          streamKey: this.streamKey,
          consumerGroup: this.consumerGroup,
          instanceId: this.instanceId,
          startId: REALTIME_CONSUMER_GROUP_START_ID,
        },
        'realtime stream consumer started',
      );

      const consumerName = `c-${this.instanceId}`;
      while (!this.stopped) {
        try {
          const result = await this.reader.xreadgroup(
            'GROUP',
            this.consumerGroup,
            consumerName,
            'COUNT',
            32,
            'BLOCK',
            2000,
            'STREAMS',
            this.streamKey,
            '>',
          );
          if (!result || this.stopped) continue;

          for (const [, messages] of result as [string, [string, string[]][]][]) {
            for (const [id, flat] of messages) {
              try {
                this.handleStreamEntry(RealtimeFanoutService.fieldsFromFlat(flat), id);
                await this.reader.xack(this.streamKey, this.consumerGroup, id);
              } catch (err) {
                this.log.error({ err, id }, 'realtime stream entry failed');
              }
            }
          }
        } catch (err) {
          if (this.stopped) break;
          this.log.error({ err }, 'realtime stream read failed');
          await this.delay(this.retryDelayMs);
        }
      }
    } finally {
      if (this.reader) {
        try {
          await this.reader.quit();
        } catch {
          this.reader.disconnect();
        }
        this.reader = null;
      }
    }
  }
}
