import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  REALTIME_CONSUMER_GROUP_START_ID,
  shouldThrottleTypingEvent,
} from '../constants/realtime.js';
import { RealtimeFanoutService } from './realtime-fanout.js';

function createMockRedis() {
  return {
    xadd: vi.fn().mockResolvedValue('1-0'),
    xgroup: vi.fn().mockResolvedValue('OK'),
    xreadgroup: vi.fn().mockResolvedValue(null),
    xautoclaim: vi.fn().mockResolvedValue(['0-0', []]),
    xack: vi.fn().mockResolvedValue(1),
    time: vi.fn().mockResolvedValue(['1722772800', '0']),
    sadd: vi.fn().mockResolvedValue(1),
    sismember: vi.fn().mockResolvedValue(0),
    pexpire: vi.fn().mockResolvedValue(1),
    duplicate: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };
}

describe('shouldThrottleTypingEvent', () => {
  it('never throttles stop_typing', () => {
    expect(shouldThrottleTypingEvent('stop_typing', Date.now(), Date.now(), 750)).toBe(false);
  });

  it('throttles rapid typing emits', () => {
    const t0 = 1_000;
    expect(shouldThrottleTypingEvent('typing', t0, t0 + 100, 750)).toBe(true);
    expect(shouldThrottleTypingEvent('typing', t0, t0 + 800, 750)).toBe(false);
  });

  it('allows typing immediately when last stamp was cleared after stop_typing', () => {
    // Route deletes the throttle key on stop_typing (lastSentAt → 0).
    const t0 = 1_000_000;
    expect(shouldThrottleTypingEvent('typing', 0, t0 + 100, 750)).toBe(false);
  });
});

describe('RealtimeFanoutService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers locally and publishes with MINID retention when Redis is configured', async () => {
    const redis = createMockRedis();
    redis.duplicate.mockReturnValue(redis);
    const deliverLocal = vi.fn();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log,
      instanceId: 'inst-a',
      streamKey: 'realtime:events',
      streamRetentionMs: 30 * 60 * 1000,
      startConsumer: false,
    });

    fanout.notifyUser('u1', 'new_message', { id: 'm1' });

    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'm1' });
    await vi.waitFor(() => expect(redis.xadd).toHaveBeenCalled());
    expect(redis.xadd).toHaveBeenCalledWith(
      'realtime:events',
      'MINID',
      '~',
      expect.stringMatching(/^\d+-0$/),
      '*',
      'userId',
      'u1',
      'event',
      'new_message',
      'payload',
      JSON.stringify({ id: 'm1' }),
      'originInstanceId',
      'inst-a',
      'ts',
      expect.any(String),
    );

    await fanout.stop();
  });

  it('retries XADD publish on transient Redis failure then succeeds', async () => {
    const redis = createMockRedis();
    redis.duplicate.mockReturnValue(redis);
    redis.xadd.mockRejectedValueOnce(new Error('READONLY')).mockResolvedValue('2-0');
    const deliverLocal = vi.fn();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log,
      instanceId: 'inst-a',
      streamKey: 'realtime:events',
      publishMaxAttempts: 3,
      retryDelayMs: 5,
      startConsumer: false,
    });

    fanout.notifyUser('u1', 'new_message', { id: 'm1' });

    await vi.waitFor(() => expect(redis.xadd).toHaveBeenCalledTimes(2));
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, maxAttempts: 3 }),
      'realtime stream publish attempt failed',
    );
    expect(log.error).not.toHaveBeenCalled();

    await fanout.stop();
  });

  it('delivers locally only when Redis is disabled', async () => {
    const deliverLocal = vi.fn();
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      startConsumer: false,
    });

    fanout.notifyUser('u1', 'new_message', { id: 'm1' });
    expect(deliverLocal).toHaveBeenCalledTimes(1);
  });

  it('skips stream entries that originated on this instance', async () => {
    const deliverLocal = vi.fn();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs,
      startConsumer: false,
    });

    await fanout.handleStreamEntry({
      userId: 'u1',
      event: 'new_message',
      payload: '{"id":"m1"}',
      originInstanceId: 'inst-a',
      ts: '2026-08-04T12:00:01.000Z',
    });
    expect(deliverLocal).not.toHaveBeenCalled();

    await fanout.handleStreamEntry({
      userId: 'u1',
      event: 'new_message',
      payload: '{"id":"m1"}',
      originInstanceId: 'inst-b',
      ts: '2026-08-04T12:00:01.000Z',
    });
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'm1' });
  });

  it('skips historical stream entries older than process start', async () => {
    const deliverLocal = vi.fn();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs,
      catchUpGraceMs: 5_000,
      startConsumer: false,
    });

    await fanout.handleStreamEntry({
      userId: 'u1',
      event: 'new_message',
      payload: '{"id":"old"}',
      originInstanceId: 'inst-b',
      ts: '2026-08-04T11:00:00.000Z',
    });
    expect(deliverLocal).not.toHaveBeenCalled();

    // Peer publish during bootstrap (after start) is still delivered.
    await fanout.handleStreamEntry({
      userId: 'u1',
      event: 'new_message',
      payload: '{"id":"live"}',
      originInstanceId: 'inst-b',
      ts: '2026-08-04T12:00:02.000Z',
    });
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'live' });
  });

  it('skips legacy entries without ts using the Redis stream id time', async () => {
    const deliverLocal = vi.fn();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs,
      catchUpGraceMs: 5_000,
      startConsumer: false,
    });

    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"legacy"}',
        originInstanceId: 'inst-b',
      },
      `${startedAtMs - 60_000}-0`,
    );
    expect(deliverLocal).not.toHaveBeenCalled();

    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"fresh"}',
        originInstanceId: 'inst-b',
      },
      `${startedAtMs + 1_000}-0`,
    );
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'fresh' });
  });

  it('keeps live peer events when publisher ts lags behind stream id time', async () => {
    const deliverLocal = vi.fn();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs,
      catchUpGraceMs: 5_000,
      startConsumer: false,
    });

    // Publisher clock is 10 minutes behind; Redis stream id is after process start.
    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"skewed"}',
        originInstanceId: 'inst-b',
        ts: '2026-08-04T11:50:00.000Z',
      },
      `${startedAtMs + 2_000}-0`,
    );
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'skewed' });
  });

  it('skips stale retained entries even when publisher ts is in the future', async () => {
    const deliverLocal = vi.fn();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs,
      catchUpGraceMs: 5_000,
      startConsumer: false,
    });

    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"stale"}',
        originInstanceId: 'inst-b',
        ts: '2026-08-04T12:30:00.000Z',
      },
      `${startedAtMs - 60_000}-0`,
    );
    expect(deliverLocal).not.toHaveBeenCalled();
  });

  it('delivers live peer events when consumer clock is ahead of Redis stream id', async () => {
    const deliverLocal = vi.fn();
    const redisMs = Date.parse('2026-08-04T12:00:00.000Z');
    // Local boot time is 30s ahead of Redis — without TIME sync this would drop live ids.
    const startedAtMs = redisMs + 30_000;
    const redis = createMockRedis();
    // Sync happens at "now" = startedAtMs + 1s on the local clock; Redis TIME matches real era.
    const localNow = startedAtMs + 1_000;
    const redisNow = redisMs + 1_000;
    redis.time.mockResolvedValue([String(Math.floor(redisNow / 1000)), '0']);

    vi.spyOn(Date, 'now').mockReturnValue(localNow);

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs,
      catchUpGraceMs: 5_000,
      startConsumer: false,
    });

    await fanout.syncCatchUpCutoffFromRedis(redis as never);
    // startedAt mapped onto Redis timeline ≈ redisMs, minus grace.
    expect(fanout.getCatchUpCutoffMs()).toBe(redisMs - 5_000);

    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"live"}',
        originInstanceId: 'inst-b',
        ts: '2026-08-04T11:00:00.000Z',
      },
      `${redisMs + 1_000}-0`,
    );
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'live' });
  });

  it('keeps peer events published during a long bootstrap when Redis TIME is synced late', async () => {
    const deliverLocal = vi.fn();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const graceMs = 5_000;
    // Bootstrap took 60s — Redis TIME at sync is far past startedAt + grace.
    const bootstrapDurationMs = 60_000;
    const redis = createMockRedis();
    redis.time.mockResolvedValue([
      String(Math.floor((startedAtMs + bootstrapDurationMs) / 1000)),
      '0',
    ]);
    vi.spyOn(Date, 'now').mockReturnValue(startedAtMs + bootstrapDurationMs);

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs,
      catchUpGraceMs: graceMs,
      startConsumer: false,
    });

    await fanout.syncCatchUpCutoffFromRedis(redis as never);
    expect(fanout.getCatchUpCutoffMs()).toBe(startedAtMs - graceMs);

    // Peer event published mid-bootstrap (after start, before sync).
    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"during-bootstrap"}',
        originInstanceId: 'inst-b',
      },
      `${startedAtMs + 10_000}-0`,
    );
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'during-bootstrap' });
  });

  it('drops entries with no usable timestamp', async () => {
    const deliverLocal = vi.fn();
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startedAtMs: Date.now(),
      startConsumer: false,
    });

    await fanout.handleStreamEntry({
      userId: 'u1',
      event: 'new_message',
      payload: '{"id":"no-ts"}',
      originInstanceId: 'inst-b',
    });
    expect(deliverLocal).not.toHaveBeenCalled();
  });

  it('skips retained self-publishes remembered by stream entry id', async () => {
    const redis = createMockRedis();
    redis.xadd.mockResolvedValue('99-0');
    redis.sismember.mockImplementation(async (key: string) =>
      key.includes(':published:') ? 1 : 0,
    );
    const deliverLocal = vi.fn();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'saas-api-0',
      startedAtMs,
      catchUpGraceMs: 5_000,
      startConsumer: false,
    });

    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"self"}',
        // Different origin string simulates a misconfigured id; remembered entry still skips.
        originInstanceId: 'saas-api-0-old',
        ts: '2026-08-04T12:00:01.000Z',
      },
      '99-0',
    );
    expect(redis.sismember).toHaveBeenCalledWith('realtime:fanout:published:saas-api-0', '99-0');
    expect(deliverLocal).not.toHaveBeenCalled();
  });

  it('skips reclaim redelivery when stream entry was already delivered locally', async () => {
    const redis = createMockRedis();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const entryId = `${startedAtMs + 1_000}-0`;
    redis.sismember.mockImplementation(async (key: string) =>
      key.includes(':delivered:') ? 1 : 0,
    );
    const deliverLocal = vi.fn();

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'saas-api-0',
      startedAtMs,
      catchUpGraceMs: 5_000,
      startConsumer: false,
    });

    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"peer"}',
        originInstanceId: 'saas-api-1',
        ts: '2026-08-04T12:00:01.000Z',
      },
      entryId,
    );

    expect(redis.sismember).toHaveBeenCalledWith('realtime:fanout:delivered:saas-api-0', entryId);
    expect(deliverLocal).not.toHaveBeenCalled();
  });

  it('remembers delivered stream entry ids after local fan-in', async () => {
    const redis = createMockRedis();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const entryId = `${startedAtMs + 1_000}-0`;
    const deliverLocal = vi.fn();

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'saas-api-0',
      startedAtMs,
      catchUpGraceMs: 5_000,
      streamRetentionMs: 30 * 60 * 1000,
      startConsumer: false,
    });

    await fanout.handleStreamEntry(
      {
        userId: 'u1',
        event: 'new_message',
        payload: '{"id":"peer"}',
        originInstanceId: 'saas-api-1',
        ts: '2026-08-04T12:00:01.000Z',
      },
      entryId,
    );

    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'peer' });
    expect(redis.sadd).toHaveBeenCalledWith('realtime:fanout:delivered:saas-api-0', entryId);
    expect(redis.pexpire).toHaveBeenCalledWith(
      'realtime:fanout:delivered:saas-api-0',
      30 * 60 * 1000,
    );
  });

  it('remembers published stream entry ids after XADD', async () => {
    const redis = createMockRedis();
    redis.duplicate.mockReturnValue(redis);
    redis.xadd.mockResolvedValue('42-0');
    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'saas-api-0',
      streamKey: 'realtime:events',
      streamRetentionMs: 30 * 60 * 1000,
      startConsumer: false,
    });

    fanout.notifyUser('u1', 'new_message', { id: 'm1' });
    await vi.waitFor(() => expect(redis.sadd).toHaveBeenCalled());
    expect(redis.sadd).toHaveBeenCalledWith('realtime:fanout:published:saas-api-0', '42-0');
    expect(redis.pexpire).toHaveBeenCalledWith(
      'realtime:fanout:published:saas-api-0',
      30 * 60 * 1000,
    );
    await fanout.stop();
  });

  it('requires a stable INSTANCE_ID when Redis fan-out is enabled', () => {
    const prev = process.env.INSTANCE_ID;
    delete process.env.INSTANCE_ID;
    const redis = createMockRedis();
    expect(
      () =>
        new RealtimeFanoutService({
          redis: redis as never,
          deliverLocal: vi.fn(),
          log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
          startConsumer: false,
        }),
    ).toThrow(/INSTANCE_ID is required/);
    if (prev === undefined) delete process.env.INSTANCE_ID;
    else process.env.INSTANCE_ID = prev;
  });

  it('reclaims idle PEL entries via XAUTOCLAIM then ACKs', async () => {
    const redis = createMockRedis();
    const startedAtMs = Date.parse('2026-08-04T12:00:00.000Z');
    const entryId = `${startedAtMs + 1_000}-0`;
    redis.xautoclaim.mockResolvedValue([
      '0-0',
      [
        [
          entryId,
          [
            'userId',
            'u1',
            'event',
            'new_message',
            'payload',
            '{"id":"reclaimed"}',
            'originInstanceId',
            'inst-b',
            'ts',
            '2026-08-04T12:00:01.000Z',
          ],
        ],
      ],
    ]);
    const deliverLocal = vi.fn();

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      streamKey: 'realtime:events',
      startedAtMs,
      pelMinIdleMs: 5_000,
      startConsumer: false,
    });

    const count = await fanout.reclaimPendingEntries(redis as never, 'c-inst-a');

    expect(count).toBe(1);
    expect(redis.xautoclaim).toHaveBeenCalledWith(
      'realtime:events',
      'realtime:inst:inst-a',
      'c-inst-a',
      5_000,
      '0-0',
      'COUNT',
      32,
    );
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'reclaimed' });
    expect(redis.xack).toHaveBeenCalledWith('realtime:events', 'realtime:inst:inst-a', entryId);
  });

  it('creates consumer groups at 0 so late bootstrap can catch peer publishes', async () => {
    const redis = createMockRedis();
    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      streamKey: 'realtime:events',
      startConsumer: false,
    });

    await fanout.ensureConsumerGroup(redis as never);

    expect(REALTIME_CONSUMER_GROUP_START_ID).toBe('0');
    expect(redis.xgroup).toHaveBeenCalledWith(
      'CREATE',
      'realtime:events',
      'realtime:inst:inst-a',
      '0',
      'MKSTREAM',
    );
  });

  it('retries consumer bootstrap after failure then succeeds', async () => {
    const redis = createMockRedis();
    redis.xgroup.mockRejectedValueOnce(new Error('NOAUTH')).mockResolvedValue('OK');
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const fanout = new RealtimeFanoutService({
      redis: redis as never,
      deliverLocal: vi.fn(),
      log,
      instanceId: 'inst-a',
      streamKey: 'realtime:events',
      retryDelayMs: 5,
      startConsumer: false,
    });

    const ok = await fanout.bootstrapConsumerGroup(redis as never);

    expect(ok).toBe(true);
    expect(redis.xgroup).toHaveBeenCalledTimes(2);
    expect(redis.time).toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'realtime stream bootstrap failed',
    );
  });

  it('parses flat Redis field arrays', () => {
    expect(
      RealtimeFanoutService.fieldsFromFlat(['userId', 'u1', 'event', 'ping', 'payload', '{}']),
    ).toEqual({ userId: 'u1', event: 'ping', payload: '{}' });
  });
});
