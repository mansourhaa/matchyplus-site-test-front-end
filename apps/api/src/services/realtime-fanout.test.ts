import { afterEach, describe, expect, it, vi } from 'vitest';

import { RealtimeFanoutService } from './realtime-fanout.js';

function createMockRedis() {
  return {
    xadd: vi.fn().mockResolvedValue('1-0'),
    xgroup: vi.fn().mockResolvedValue('OK'),
    xreadgroup: vi.fn().mockResolvedValue(null),
    xack: vi.fn().mockResolvedValue(1),
    duplicate: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };
}

describe('RealtimeFanoutService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers locally and publishes to the stream when Redis is configured', async () => {
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
      startConsumer: false,
    });

    fanout.notifyUser('u1', 'new_message', { id: 'm1' });

    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'm1' });
    await vi.waitFor(() => expect(redis.xadd).toHaveBeenCalled());
    expect(redis.xadd).toHaveBeenCalledWith(
      'realtime:events',
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

  it('delivers locally only when Redis is disabled', () => {
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

  it('skips stream entries that originated on this instance', () => {
    const deliverLocal = vi.fn();
    const fanout = new RealtimeFanoutService({
      redis: null,
      deliverLocal,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      instanceId: 'inst-a',
      startConsumer: false,
    });

    fanout.handleStreamEntry({
      userId: 'u1',
      event: 'new_message',
      payload: '{"id":"m1"}',
      originInstanceId: 'inst-a',
    });
    expect(deliverLocal).not.toHaveBeenCalled();

    fanout.handleStreamEntry({
      userId: 'u1',
      event: 'new_message',
      payload: '{"id":"m1"}',
      originInstanceId: 'inst-b',
    });
    expect(deliverLocal).toHaveBeenCalledWith('u1', 'new_message', { id: 'm1' });
  });

  it('parses flat Redis field arrays', () => {
    expect(
      RealtimeFanoutService.fieldsFromFlat(['userId', 'u1', 'event', 'ping', 'payload', '{}']),
    ).toEqual({ userId: 'u1', event: 'ping', payload: '{}' });
  });
});
