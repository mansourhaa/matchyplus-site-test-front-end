import type { Redis } from 'ioredis';

import {
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
  /** Override for tests — skip starting the consumer loop. */
  startConsumer?: boolean;
};

/**
 * Local WebSocket deliver + Redis Streams fan-out for multi-instance APIs.
 * Each instance owns a consumer group so every node receives every event.
 */
export class RealtimeFanoutService {
  readonly instanceId: string;
  readonly streamKey: string;
  readonly consumerGroup: string;

  private readonly redis: Redis | null;
  private readonly deliverLocal: RealtimeDeliver;
  private readonly log: RealtimeFanoutLogger;
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

    if (this.redis && options.startConsumer !== false) {
      this.loopPromise = this.startConsumerLoop();
    }
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
    await this.redis.xadd(
      this.streamKey,
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

  async ensureConsumerGroup(client: Redis = this.redis!): Promise<void> {
    try {
      await client.xgroup('CREATE', this.streamKey, this.consumerGroup, '0', 'MKSTREAM');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('BUSYGROUP')) throw err;
    }
  }

  /**
   * Apply a stream entry on this instance. Skips events we already delivered locally.
   */
  handleStreamEntry(fields: Record<string, string>): void {
    const originInstanceId = fields.originInstanceId || '';
    if (originInstanceId === this.instanceId) return;

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

  private async startConsumerLoop(): Promise<void> {
    if (!this.redis) return;

    this.reader = this.redis.duplicate();
    try {
      await this.ensureConsumerGroup(this.reader);
      this.log.info(
        {
          streamKey: this.streamKey,
          consumerGroup: this.consumerGroup,
          instanceId: this.instanceId,
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
                this.handleStreamEntry(RealtimeFanoutService.fieldsFromFlat(flat));
                await this.reader.xack(this.streamKey, this.consumerGroup, id);
              } catch (err) {
                this.log.error({ err, id }, 'realtime stream entry failed');
              }
            }
          }
        } catch (err) {
          if (this.stopped) break;
          this.log.error({ err }, 'realtime stream read failed');
          await new Promise((r) => setTimeout(r, 1000));
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
