import { describe, expect, it, vi } from 'vitest';

import { SwipeDirection, UserPlan } from '@saas-boilerplate/types';

import { SwipeService } from './swipe.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    userBlock: {
      findFirst: vi.fn(),
    },
    swipe: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    swipeLog: {
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    match: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('SwipeService', () => {
  it('creates a match and notifies both users on a reciprocal right swipe', async () => {
    const prisma = createMockPrisma();
    const notify = vi.fn();
    const matchedAt = new Date('2026-07-28T08:00:00.000Z');

    prisma.user.findUnique.mockImplementation(async ({ where, select }) => {
      if (select?.plan) {
        return { plan: UserPlan.FREE };
      }

      if (where.id === 'u2') {
        return { id: 'u2', name: 'Bob Builder', image: 'bob.png' };
      }

      if (where.id === 'u1') {
        return { id: 'u1', name: 'Alice Doe', image: 'alice.png' };
      }

      return null;
    });
    prisma.plan.findUnique.mockResolvedValue({ swipes_per_day: 20 });
    prisma.userBlock.findFirst.mockResolvedValue(null);
    prisma.swipe.findUnique.mockResolvedValue(null);
    prisma.swipe.upsert.mockResolvedValue({ id: 'swipe-1' });
    prisma.swipe.findFirst.mockResolvedValue({ id: 'reciprocal-like' });
    prisma.swipeLog.create.mockResolvedValue({ id: 'log-1' });
    prisma.swipeLog.count.mockResolvedValue(1);
    prisma.match.findUnique.mockResolvedValue(null);
    prisma.match.create.mockResolvedValue({
      id: 'match-1',
      matched_at: matchedAt,
    });
    prisma.user.updateMany.mockResolvedValue({ count: 2 });

    const service = new SwipeService({ prisma: prisma as never, notify });
    const result = await service.postSwipe('u1', {
      target_user_id: 'u2',
      direction: 'right',
    });

    expect(result).toMatchObject({
      swipe_id: 'swipe-1',
      direction: SwipeDirection.RIGHT,
      match: {
        match_id: 'match-1',
        matched_at: matchedAt,
        matched_user_id: 'u2',
      },
      quota: {
        unlimited: false,
        used: 1,
        limit: 20,
        remaining: 19,
      },
    });

    expect(prisma.match.create).toHaveBeenCalledWith({
      data: {
        user_low_id: 'u1',
        user_high_id: 'u2',
      },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
      data: { matches: { increment: 1 } },
    });

    expect(notify).toHaveBeenCalledTimes(3);
    expect(notify).toHaveBeenNthCalledWith(
      1,
      'u2',
      'notification_match',
      expect.objectContaining({
        event_type: 'match_request',
        actor_first_name: 'Alice',
        from_user_id: 'u1',
      }),
    );
    expect(notify).toHaveBeenNthCalledWith(
      2,
      'u1',
      'notification_match',
      expect.objectContaining({
        event_type: 'match',
        match_id: 'match-1',
        matched_user_id: 'u2',
      }),
    );
    expect(notify).toHaveBeenNthCalledWith(
      3,
      'u2',
      'notification_match',
      expect.objectContaining({
        event_type: 'match',
        match_id: 'match-1',
        matched_user_id: 'u1',
      }),
    );
  });

  it('withdraws a pending like by logging WITHDRAWN instead of a permanent pass', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u2' });
    prisma.match.findUnique.mockResolvedValue(null);
    prisma.swipe.deleteMany.mockResolvedValue({ count: 1 });
    prisma.swipeLog.create.mockResolvedValue({ id: 'log-2' });

    const service = new SwipeService({ prisma: prisma as never });
    const result = await service.withdrawPending('u1', 'u2');

    expect(result).toEqual({ withdrawn_user_id: 'u2' });
    expect(prisma.swipe.deleteMany).toHaveBeenCalledWith({
      where: {
        swiper_id: 'u1',
        target_id: 'u2',
        direction: SwipeDirection.RIGHT,
      },
    });
    expect(prisma.swipeLog.create).toHaveBeenCalledWith({
      data: {
        user_id: 'u1',
        target_id: 'u2',
        direction: SwipeDirection.WITHDRAWN,
      },
    });
  });
});
