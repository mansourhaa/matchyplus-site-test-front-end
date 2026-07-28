import { PrismaClient, SwipeDirection, UserPlan } from '@saas-boilerplate/types';

import { SwipeQuota } from '../types/matching.js';
import { utcDayBounds } from '../utils/utc-day.js';

/** Daily RIGHT swipe allowance from Plan.swipes_per_day (-1 = unlimited). */
export async function resolveSwipeQuota(
  prisma: PrismaClient,
  userId: string,
): Promise<{ plan: UserPlan; limit: number | null; unlimited: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const plan = user?.plan ?? UserPlan.FREE;

  const planRow = await prisma.plan.findUnique({
    where: { id: plan },
    select: { swipes_per_day: true },
  });

  const swipesPerDay = planRow?.swipes_per_day ?? 20;
  if (swipesPerDay < 0) {
    return { plan, limit: null, unlimited: true };
  }
  return { plan, limit: swipesPerDay, unlimited: false };
}

/** Source of truth for quota: SwipeLog RIGHT rows in the current UTC day. */
export async function countTodayRightSwipes(
  prisma: PrismaClient,
  userId: string,
  now = new Date(),
): Promise<number> {
  const { start, end } = utcDayBounds(now);
  return prisma.swipeLog.count({
    where: {
      user_id: userId,
      direction: SwipeDirection.RIGHT,
      swiped_at: { gte: start, lt: end },
    },
  });
}

export async function buildQuotaSnapshot(
  prisma: PrismaClient,
  userId: string,
): Promise<SwipeQuota> {
  const { plan, limit, unlimited } = await resolveSwipeQuota(prisma, userId);
  if (unlimited) {
    return {
      plan,
      unlimited: true,
      used: null,
      limit: null,
      remaining: null,
      resets_at: 'midnight_utc',
    };
  }
  const used = await countTodayRightSwipes(prisma, userId);
  return {
    plan,
    unlimited: false,
    used,
    limit,
    remaining: Math.max(0, (limit ?? 0) - used),
    resets_at: 'midnight_utc',
  };
}
