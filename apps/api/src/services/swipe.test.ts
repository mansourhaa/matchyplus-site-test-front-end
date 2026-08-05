import { describe, expect, it, vi } from 'vitest';

import { SwipeDirection, UserPlan } from '@saas-boilerplate/types';

import { SwipeService } from './swipe.js';

function createMockPrisma() {
  const prisma = {
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
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    },
    plan: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

const prefsEnabled = {
  notify_all: true,
  notify_matches: true,
  notify_messages: true,
  notify_views: true,
  notify_email: true,
};

describe('SwipeService', () => {
  it('creates a match and notifies both users on a reciprocal right swipe', async () => {
    const prisma = createMockPrisma();
    const notify = vi.fn();
    const matchedAt = new Date('2026-07-28T08:00:00.000Z');

    prisma.user.findUnique.mockImplementation(async ({ where, select }) => {
      if (select?.plan) {
        return { plan: UserPlan.FREE };
      }

      if (select?.notify_all !== undefined || select?.notify_matches !== undefined) {
        return prefsEnabled;
      }

      if (where.id === 'u2') {
        return { id: 'u2', name: 'Bob Builder', image: 'bob.png' };
      }

      if (where.id === 'u1') {
        return { id: 'u1', name: 'Alice Doe', image: 'alice.png' };
      }

      return null;
    });
    let notifSeq = 0;
    prisma.notification.create.mockImplementation(async () => ({ id: `notif-${++notifSeq}` }));
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
    prisma.conversation.findUnique.mockResolvedValue(null);
    prisma.conversation.create.mockResolvedValue({
      id: 'conv-1',
      match_id: 'match-1',
      user_low_id: 'u1',
      user_high_id: 'u2',
    });

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
        conversation_id: 'conv-1',
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
    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        match_id: 'match-1',
        user_low_id: 'u1',
        user_high_id: 'u2',
      },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
      data: { matches: { increment: 1 } },
    });

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenNthCalledWith(
      1,
      'u1',
      'notification_match',
      expect.objectContaining({
        event_type: 'match',
        match_id: 'match-1',
        matched_user_id: 'u2',
        conversation_id: 'conv-1',
        notification_id: expect.any(String),
      }),
    );
    expect(notify).toHaveBeenNthCalledWith(
      2,
      'u2',
      'notification_match',
      expect.objectContaining({
        event_type: 'match',
        match_id: 'match-1',
        matched_user_id: 'u1',
        conversation_id: 'conv-1',
        notification_id: expect.any(String),
      }),
    );
  });

  it('emits a match_request only when the right swipe is not yet mutual', async () => {
    const prisma = createMockPrisma();
    const notify = vi.fn();

    prisma.user.findUnique.mockImplementation(async ({ where, select }) => {
      if (select?.plan) {
        return { plan: UserPlan.FREE };
      }
      if (select?.notify_all !== undefined || select?.notify_matches !== undefined) {
        return prefsEnabled;
      }
      if (where.id === 'u1') {
        return { id: 'u1', name: 'Alice Doe', image: 'alice.png' };
      }
      if (where.id === 'u2') {
        return { id: 'u2', name: 'Bob Builder', image: 'bob.png' };
      }
      return null;
    });
    prisma.plan.findUnique.mockResolvedValue({ swipes_per_day: 20 });
    prisma.userBlock.findFirst.mockResolvedValue(null);
    prisma.swipe.findUnique.mockResolvedValue(null);
    prisma.swipe.upsert.mockResolvedValue({
      id: 'swipe-1',
      swiper_id: 'u1',
      target_id: 'u2',
      direction: SwipeDirection.RIGHT,
    });
    prisma.swipeLog.create.mockResolvedValue({ id: 'log-1' });
    prisma.swipe.findFirst.mockResolvedValue(null);
    prisma.swipeLog.count.mockResolvedValue(1);
    prisma.notification.create.mockResolvedValue({ id: 'notif-req' });

    const service = new SwipeService({ prisma: prisma as never, notify });
    const result = await service.postSwipe('u1', {
      target_user_id: 'u2',
      direction: 'right',
    });

    expect(result.match).toBeNull();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      'u2',
      'notification_match',
      expect.objectContaining({
        event_type: 'match_request',
        actor_first_name: 'Alice',
        from_user_id: 'u1',
        notification_id: 'notif-req',
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

  it('rejects a right swipe when the daily quota is exhausted', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockImplementation(async ({ where, select }) => {
      if (select?.plan) return { plan: UserPlan.FREE };
      if (where.id === 'u2') return { id: 'u2', name: 'Bob', image: null };
      return null;
    });
    prisma.plan.findUnique.mockResolvedValue({ swipes_per_day: 2 });
    prisma.userBlock.findFirst.mockResolvedValue(null);
    prisma.swipeLog.count.mockResolvedValue(2);

    const service = new SwipeService({ prisma: prisma as never });

    await expect(
      service.postSwipe('u1', { target_user_id: 'u2', direction: 'right' }),
    ).rejects.toMatchObject({
      statusCode: 429,
    });

    expect(prisma.swipe.upsert).not.toHaveBeenCalled();
    expect(prisma.match.create).not.toHaveBeenCalled();
  });

  it('rejects a swipe when either user has blocked the other', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', name: 'Bob', image: null });
    prisma.userBlock.findFirst.mockResolvedValue({ id: 'block-1' });

    const service = new SwipeService({ prisma: prisma as never });

    await expect(
      service.postSwipe('u1', { target_user_id: 'u2', direction: 'right' }),
    ).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(prisma.swipe.upsert).not.toHaveBeenCalled();
  });

  it('unmatches a pair, clears swipe history, and notifies both users', async () => {
    const prisma = createMockPrisma();
    const notify = vi.fn();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    prisma.swipe.deleteMany.mockResolvedValue({ count: 2 });
    prisma.swipeLog.deleteMany.mockResolvedValue({ count: 2 });
    prisma.match.deleteMany.mockResolvedValue({ count: 1 });

    const service = new SwipeService({ prisma: prisma as never, notify });
    const result = await service.unmatch('u1', 'u2');

    expect(result).toEqual({ removed_user_id: 'u2' });
    expect(prisma.swipe.deleteMany).toHaveBeenCalled();
    expect(prisma.swipeLog.deleteMany).toHaveBeenCalled();
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: {
        user_low_id: 'u1',
        user_high_id: 'u2',
      },
    });
    expect(notify).toHaveBeenCalledWith('u1', 'match_removed', { matched_user_id: 'u2' });
    expect(notify).toHaveBeenCalledWith('u2', 'match_removed', { matched_user_id: 'u1' });
  });
});
