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
      findUnique: vi.fn().mockResolvedValue({ id: 'me', job: 'x' }),
      findMany: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    },
    swipeLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          direction: 'RIGHT',
          swiped_at: new Date('2026-11-19T10:00:00Z'),
          target: { id: 'z', job: 'Plombier' },
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
    expect(sent.candidates[0]).toMatchObject({ id: 'a', distance_km: 3 });
    expect(sent.swipes).toEqual([
      { direction: 'like', at: '2026-11-19T10:00:00.000Z', profile: { id: 'z', job: 'Plombier' } },
    ]);
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
});
