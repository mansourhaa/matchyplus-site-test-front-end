import { describe, expect, it, vi } from 'vitest';

import { FeedProfile } from '../types/matching.js';
import { VoiceAgentsService } from './voice-agents.js';

function feedProfile(id: string, score: number): FeedProfile {
  return {
    id,
    name: id,
    image: null,
    bio: null,
    job: null,
    category: null,
    city: null,
    interests: [],
    goals: [],
    activity_sector: null,
    service_type: null,
    rating: 0,
    distance_km: 3,
    match_score: score,
    match_group: 1,
    match_type_label: '',
    confidence: 'low',
    compatibility: [],
    liked_me: false,
  };
}

function prismaMock() {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'me', job: 'x', video: null }),
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: 'a', video: '/uploads/videos/a.webm' },
          { id: 'b' },
          { id: 'c' },
        ]),
    },
    swipeLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          direction: 'RIGHT',
          swiped_at: new Date('2026-11-19T10:00:00Z'),
          target: { id: 'z', job: 'Plombier', video: null },
        },
      ]),
    },
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('VoiceAgentsService', () => {
  it('does nothing unless MATCHING_ENGINE=agents', async () => {
    const fetchMock = vi.fn();
    const service = new VoiceAgentsService({
      prisma: prismaMock() as never,
      enabled: false,
      fetchImpl: fetchMock,
    });

    await expect(service.rank('me', [feedProfile('a', 50)], 50)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ranks the feed with the agents and puts the boosted profile second', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        sponsored: 'c',
        results: [
          {
            id: 'b',
            score: 81,
            confidence: 'high',
            dimensions: [{ key: 'interests', score: 90.4, weight: 0.28, contribution: 25.3 }],
          },
          { id: 'a', score: 60, confidence: 'medium', dimensions: [] },
          { id: 'c', score: 40, confidence: 'low', dimensions: [] },
        ],
      }),
    );
    const prisma = prismaMock();
    const service = new VoiceAgentsService({
      prisma: prisma as never,
      enabled: true,
      baseUrl: 'http://voice-ai:8001',
      fetchImpl: fetchMock,
    });

    const ranked = await service.rank(
      'me',
      [feedProfile('a', 90), feedProfile('b', 10), feedProfile('c', 50)],
      50,
    );

    expect(ranked?.map((profile) => profile.id)).toEqual(['b', 'c', 'a']);
    expect(ranked?.[0]).toMatchObject({
      match_score: 81,
      confidence: 'high',
      compatibility: [{ dimension: 'skills', score: 90, weight: 0.28, contribution: 25 }],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://voice-ai:8001/agents/feed');
    const sent = JSON.parse(init.body);
    expect(sent.candidates).toHaveLength(3);
    expect(sent.candidates[0]).toEqual({ id: 'a', video: true, distance_km: 3 });
    expect(sent.swipes).toEqual([
      {
        direction: 'like',
        at: '2026-11-19T10:00:00.000Z',
        profile: { id: 'z', job: 'Plombier', video: false },
      },
    ]);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('keeps the built-in order when the voice service is down', async () => {
    const service = new VoiceAgentsService({
      prisma: prismaMock() as never,
      enabled: true,
      baseUrl: 'http://host.docker.internal:8001',
      fetchImpl: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });

    await expect(service.rank('me', [feedProfile('a', 50)], 50)).resolves.toBeNull();
  });

  it('sends matching attributes and ids only (no name, phone, email, bio or media path)', async () => {
    const prisma = prismaMock();
    const service = new VoiceAgentsService({
      prisma: prisma as never,
      enabled: true,
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ ok: true, results: [] })),
    });

    await service.rank('me', [feedProfile('a', 50)], 50);

    const select = prisma.user.findMany.mock.calls[0][0].select;
    for (const field of ['name', 'phone', 'email', 'bio', 'password', 'image']) {
      expect(select).not.toHaveProperty(field);
    }
  });
});

describe('VoiceAgentsService — learned weights cache (Redis)', () => {
  function redisMock() {
    const store = new Map<string, string>();
    return {
      store,
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
    };
  }

  const reply = () =>
    jsonResponse({
      ok: true,
      sponsored: null,
      prefs: { categoryWeights: { btp: 1.12 }, tagWeights: {}, interactionCount: 1 },
      results: [{ id: 'a', score: 70, confidence: 'medium', dimensions: [] }],
    });

  it('learns from the swipes once, then reuses the weights until a new swipe', async () => {
    const prisma = {
      ...prismaMock(),
      swipeLog: {
        ...prismaMock().swipeLog,
        findFirst: vi.fn().mockResolvedValue({ id: 'swipe-1' }),
      },
    };
    const redis = redisMock();
    const fetchMock = vi.fn().mockImplementation(async () => reply());
    const service = new VoiceAgentsService({
      prisma: prisma as never,
      redis: redis as never,
      enabled: true,
      baseUrl: 'http://voice-ai:8001',
      fetchImpl: fetchMock,
    });

    // 1st call: no cache → the 500 swipes are read and sent, the weights are stored.
    await service.rank('me', [feedProfile('a', 50)], 50);
    expect(prisma.swipeLog.findMany).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).swipes).toHaveLength(1);
    expect(JSON.parse(redis.store.get('agents:prefs:me')!)).toEqual({
      lastSwipeId: 'swipe-1',
      prefs: { categoryWeights: { btp: 1.12 }, tagWeights: {}, interactionCount: 1 },
    });

    // 2nd call (next page, refresh…): same newest swipe → weights from Redis, no SwipeLog read.
    await service.rank('me', [feedProfile('a', 50)], 50);
    expect(prisma.swipeLog.findMany).toHaveBeenCalledTimes(1);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.swipes).toEqual([]);
    expect(second.prefs).toEqual({
      categoryWeights: { btp: 1.12 },
      tagWeights: {},
      interactionCount: 1,
    });

    // New swipe → learned again.
    prisma.swipeLog.findFirst.mockResolvedValue({ id: 'swipe-2' });
    await service.rank('me', [feedProfile('a', 50)], 50);
    expect(prisma.swipeLog.findMany).toHaveBeenCalledTimes(2);
  });

  it('still ranks when Redis fails', async () => {
    const prisma = {
      ...prismaMock(),
      swipeLog: { ...prismaMock().swipeLog, findFirst: vi.fn() },
    };
    const redis = { get: vi.fn().mockRejectedValue(new Error('down')), set: vi.fn() };
    const service = new VoiceAgentsService({
      prisma: prisma as never,
      redis: redis as never,
      enabled: true,
      baseUrl: 'http://voice-ai:8001',
      fetchImpl: vi.fn().mockImplementation(async () => reply()),
    });

    const ranked = await service.rank('me', [feedProfile('a', 50)], 50);
    expect(ranked?.[0]?.match_score).toBe(70);
    expect(prisma.swipeLog.findMany).toHaveBeenCalledTimes(1);
  });
});
