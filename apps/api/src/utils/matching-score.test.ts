import { describe, expect, it } from 'vitest';

import { orderedUserPair } from '../utils/match-pair.js';
import { RECIPROCITY_BOOST, computeMatchScore, skillsScore } from '../utils/matching-score.js';
import { utcDayBounds } from '../utils/utc-day.js';

describe('orderedUserPair', () => {
  it('orders ids lexicographically', () => {
    expect(orderedUserPair('b', 'a')).toEqual({
      userLowId: 'a',
      userHighId: 'b',
    });
    expect(orderedUserPair('a', 'b')).toEqual({
      userLowId: 'a',
      userHighId: 'b',
    });
  });
});

describe('utcDayBounds', () => {
  it('returns a 24h UTC window', () => {
    const { start, end } = utcDayBounds(new Date('2026-07-27T15:30:00.000Z'));
    expect(start.toISOString()).toBe('2026-07-27T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-28T00:00:00.000Z');
  });
});

describe('skillsScore', () => {
  it('rewards overlap ratio rather than raw tag count', () => {
    const me = { id: '1', interests: ['react', 'node'] };
    const focused = { id: '2', interests: ['react', 'node'] };
    const spammy = {
      id: '3',
      interests: ['react', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    };

    expect(skillsScore(me, focused)).toBe(100);
    expect(skillsScore(me, spammy)).toBeLessThan(skillsScore(me, focused));
  });
});

describe('computeMatchScore', () => {
  it('boosts reciprocity without exceeding 100', () => {
    const me = {
      id: '1',
      goals: ['Trouver un job'],
      activity_sector: 'IT',
      interests: ['react'],
    };
    const cand = {
      id: '2',
      goals: ["Recruter quelqu'un"],
      activity_sector: 'IT',
      interests: ['react'],
    };

    const base = computeMatchScore(me, cand, 3);
    const boosted = computeMatchScore(me, cand, 3, { likedMe: true });

    expect(boosted.finalScore).toBe(Math.min(100, base.finalScore + RECIPROCITY_BOOST));
    expect(boosted.reciprocityBoost).toBe(RECIPROCITY_BOOST);
    expect(boosted.matchGroup).toBe(1);
  });

  it('keeps cross-sector candidates as suggestions instead of dropping score path', () => {
    const me = {
      id: '1',
      goals: ['Trouver un job'],
      activity_sector: 'informatique',
      interests: ['typescript'],
    };
    const cand = {
      id: '2',
      goals: ['Trouver un job'],
      activity_sector: 'menage',
      interests: ['cleaning'],
    };

    const score = computeMatchScore(me, cand, null);
    expect(score.matchGroup).toBe(4);
    expect(score.finalScore).toBeLessThanOrEqual(45);
  });
});
