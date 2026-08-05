import type { Redis } from 'ioredis';

import {
  REALTIME_CATCH_UP_GRACE_MS,
  REALTIME_CONSUMER_GROUP_START_ID,
  REALTIME_PEL_MIN_IDLE_MS,
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
  /** Process start time — entries with older event times are not delivered. */
  startedAtMs?: number;
  /** Clock-skew grace before catch-up cutoff when filtering historical entries. */
  catchUpGraceMs?: number;
  /** Min idle ms before reclaiming PEL entries via XAUTOCLAIM. */
  pelMinIdleMs?: number;
  /** Max XADD attempts (initial try + retries) for cross-instance publish. */
  publishMaxAttempts?: number;
  /** Override for tests — skip starting the consumer loop. */
  startConsumer?: boolean;
  /** Backoff between bootstrap/read failures (ms). */
  retryDelayMs?: number;
};

type StreamMessages = [string, string[]][];

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
  readonly pelMinIdleMs: number;
  readonly publishMaxAttempts: number;

  /** Entries with event time below this cutoff are treated as historical replay. */
  private catchUpCutoffMs: number;

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
    this.instanceId =
      options.instanceId || realtimeInstanceId({ requireStable: Boolean(this.redis) });
    this.consumerGroup = realtimeConsumerGroup(this.instanceId);
    this.streamRetentionMs = options.streamRetentionMs ?? REALTIME_STREAM_RETENTION_MS;
    this.startedAtMs = options.startedAtMs ?? Date.now();
    this.catchUpGraceMs = options.catchUpGraceMs ?? REALTIME_CATCH_UP_GRACE_MS;
    this.catchUpCutoffMs = this.startedAtMs - this.catchUpGraceMs;
    this.pelMinIdleMs = options.pelMinIdleMs ?? REALTIME_PEL_MIN_IDLE_MS;
    this.publishMaxAttempts = Math.max(1, options.publishMaxAttempts ?? 3);
    this.retryDelayMs = options.retryDelayMs ?? 1000;

    if (this.redis && options.startConsumer !== false) {
      this.loopPromise = this.startConsumerLoop();
    }
  }

  /** Current catch-up cutoff (after Redis TIME sync when available). */
  getCatchUpCutoffMs(): number {
    return this.catchUpCutoffMs;
  }

  /** Start the consumer loop if it is not already running. */
  start(): void {
    if (!this.redis || this.loopPromise || this.stopped) return;
    this.loopPromise = this.startConsumerLoop();
  }

  /**
   * Deliver to sockets on this process, then best-effort publish for peers.
   * Always XADDs when Redis is up — peers may be connected elsewhere.
   * Publish retries transient Redis failures; after all attempts fail the error
   * is logged only — local delivery already happened and HTTP write responses
   * remain authoritative for the acting user.
   */
  notifyUser(userId: string, event: string, payload: Record<string, unknown>): void {
    this.deliverLocal(userId, event, payload);
    if (!this.redis) return;
    void this.publish(userId, event, payload).catch((err) => {
      this.log.error({ err, userId, event }, 'realtime stream publish failed after retries');
    });
  }

  async publish(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.redis) return;

    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.publishMaxAttempts; attempt++) {
      try {
        const minId = `${Date.now() - this.streamRetentionMs}-0`;
        const entryId = (await this.redis.xadd(
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
        )) as string;
        // Remember ids we published so a consumer-group recreate with the same
        // restart-stable INSTANCE_ID cannot redeliver our own retained rows.
        if (entryId) await this.rememberPublishedEntry(entryId);
        return;
      } catch (err) {
        lastErr = err;
        this.log.warn(
          { err, userId, event, attempt, maxAttempts: this.publishMaxAttempts },
          'realtime stream publish attempt failed',
        );
        if (attempt < this.publishMaxAttempts) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  /**
   * Create this instance’s consumer group from the start of the retained stream
   * (`0`) so bootstrap retries still catch peer publishes. Client-facing
   * historical replay is filtered in `handleStreamEntry` via catch-up cutoff.
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

  /**
   * Anchor catch-up cutoff to Redis TIME while preserving process-start semantics.
   * Maps `startedAtMs` onto Redis's clock via the local/Redis offset at sync time so
   * (1) a consumer clock ahead of Redis cannot drop live stream ids, and
   * (2) a long bootstrap retry cannot advance the cutoff past peer events published
   * while this instance was still ensuring the consumer group.
   * Throws when TIME is unusable so bootstrap retries instead of keeping a local-only
   * cutoff that can permanently skip live peer entries.
   */
  async syncCatchUpCutoffFromRedis(client: Redis): Promise<void> {
    const reply = (await client.time()) as unknown as [string, string];
    const sec = Number(reply[0]);
    const usec = Number(reply[1]);
    if (!Number.isFinite(sec) || !Number.isFinite(usec)) {
      throw new Error(`realtime Redis TIME unusable: ${JSON.stringify(reply)}`);
    }
    const redisMs = sec * 1000 + Math.floor(usec / 1000);
    const localNow = Date.now();
    const startedAtOnRedisTimeline = redisMs - (localNow - this.startedAtMs);
    this.catchUpCutoffMs = startedAtOnRedisTimeline - this.catchUpGraceMs;
  }

  /** Retry group ensure until success or `stop()` — used by the consumer loop. */
  async bootstrapConsumerGroup(client: Redis): Promise<boolean> {
    while (!this.stopped) {
      try {
        await this.ensureConsumerGroup(client);
        await this.syncCatchUpCutoffFromRedis(client);
        return true;
      } catch (err) {
        this.log.error({ err }, 'realtime stream bootstrap failed');
        await this.delay(this.retryDelayMs);
      }
    }
    return false;
  }

  /**
   * Apply a stream entry on this instance. Skips self-origin (live id match or
   * remembered publish ids), entries already delivered on this replica (PEL
   * reclaim after deliver-before-ack crash), and entries older than catch-up.
   * Event time prefers Redis stream id ms so publisher clock skew cannot drop
   * live events or revive stale rows via a future ISO `ts`.
   */
  async handleStreamEntry(fields: Record<string, string>, entryId?: string): Promise<void> {
    const originInstanceId = fields.originInstanceId || '';
    if (originInstanceId === this.instanceId) return;
    if (entryId && (await this.wasPublishedHere(entryId))) return;
    if (entryId && (await this.wasDeliveredHere(entryId))) return;

    const eventMs = RealtimeFanoutService.eventTimeMs(fields.ts, entryId);
    if (eventMs === null || eventMs < this.catchUpCutoffMs) {
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
    // Mark after local push so XAUTOCLAIM after a crash mid-ack does not re-push.
    if (entryId) await this.rememberDeliveredEntry(entryId);
  }

  /** Redis key for stream entry ids this INSTANCE_ID has already published. */
  publishedEntriesKey(): string {
    return `realtime:fanout:published:${this.instanceId}`;
  }

  /** Redis key for stream entry ids this INSTANCE_ID has already delivered locally. */
  deliveredEntriesKey(): string {
    return `realtime:fanout:delivered:${this.instanceId}`;
  }

  async rememberPublishedEntry(entryId: string): Promise<void> {
    if (!this.redis) return;
    const key = this.publishedEntriesKey();
    await this.redis.sadd(key, entryId);
    await this.redis.pexpire(key, this.streamRetentionMs);
  }

  async wasPublishedHere(entryId: string): Promise<boolean> {
    if (!this.redis) return false;
    return (await this.redis.sismember(this.publishedEntriesKey(), entryId)) === 1;
  }

  async rememberDeliveredEntry(entryId: string): Promise<void> {
    if (!this.redis) return;
    const key = this.deliveredEntriesKey();
    await this.redis.sadd(key, entryId);
    await this.redis.pexpire(key, this.streamRetentionMs);
  }

  async wasDeliveredHere(entryId: string): Promise<boolean> {
    if (!this.redis) return false;
    return (await this.redis.sismember(this.deliveredEntriesKey(), entryId)) === 1;
  }

  /**
   * Catch-up filter time: prefer Redis stream id (`ms-seq`) when present so a
   * future publisher `ts` cannot replay stale retained entries, and a lagging
   * publisher `ts` cannot hide live stream rows. Fall back to ISO `ts` only for
   * legacy entries without an id.
   */
  static eventTimeMs(ts: string | undefined, entryId?: string): number | null {
    if (entryId) {
      const msPart = Number(entryId.split('-')[0]);
      if (Number.isFinite(msPart)) return msPart;
    }
    if (ts) {
      const parsed = Date.parse(ts);
      if (!Number.isNaN(parsed)) return parsed;
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

  private async processStreamMessages(client: Redis, messages: StreamMessages): Promise<void> {
    for (const [id, flat] of messages) {
      try {
        await this.handleStreamEntry(RealtimeFanoutService.fieldsFromFlat(flat), id);
        await client.xack(this.streamKey, this.consumerGroup, id);
      } catch (err) {
        this.log.error({ err, id }, 'realtime stream entry failed');
      }
    }
  }

  /**
   * Reclaim idle PEL entries (failed deliver/ACK or crash after XREADGROUP).
   * Without this, only `>` is read and pending entries are never retried.
   * Already-delivered entry ids are skipped in `handleStreamEntry` so reclaim
   * after deliver-before-ack does not push duplicates to WebSockets.
   */
  async reclaimPendingEntries(client: Redis, consumerName: string): Promise<number> {
    const result = (await client.xautoclaim(
      this.streamKey,
      this.consumerGroup,
      consumerName,
      this.pelMinIdleMs,
      '0-0',
      'COUNT',
      32,
    )) as [string, StreamMessages, string[]?] | null;

    const messages = result?.[1];
    if (!messages?.length) return 0;
    await this.processStreamMessages(client, messages);
    return messages.length;
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
          pelMinIdleMs: this.pelMinIdleMs,
          catchUpCutoffMs: this.catchUpCutoffMs,
        },
        'realtime stream consumer started',
      );

      const consumerName = `c-${this.instanceId}`;
      while (!this.stopped) {
        try {
          await this.reclaimPendingEntries(this.reader, consumerName);
          if (this.stopped) break;

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

          for (const [, messages] of result as [string, StreamMessages][]) {
            await this.processStreamMessages(this.reader, messages);
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
