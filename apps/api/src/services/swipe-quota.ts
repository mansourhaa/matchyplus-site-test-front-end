import { PrismaClient, SwipeDirection, UserPlan } from '@saas-boilerplate/types';

import { SwipeQuota } from '../types/matching.js';
import { AbstractServiceOptions } from '../types/services.js';
import { utcDayBounds } from '../utils/utc-day.js';

/**
 * Plan limits + UTC-day RIGHT swipe counts.
 * Quota is always re-read from SwipeLog after writes — never trust an in-memory counter.
 */
export class SwipeQuotaService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  /** Daily RIGHT swipe allowance from Plan.swipes_per_day (-1 = unlimited). */
  async resolveSwipeQuota(
    userId: string,
  ): Promise<{ plan: UserPlan; limit: number | null; unlimited: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      const plan = user?.plan ?? UserPlan.FREE;

      const planRow = await this.prisma.plan.findUnique({
        where: { id: plan },
        select: { swipes_per_day: true },
      });

      const swipesPerDay = planRow?.swipes_per_day ?? 10;
      if (swipesPerDay < 0) {
        return { plan, limit: null, unlimited: true };
      }
      return { plan, limit: swipesPerDay, unlimited: false };
    } catch (err) {
      throw err;
    }
  }

  /** Source of truth for quota: SwipeLog RIGHT rows in the current UTC day. */
  async countTodayRightSwipes(userId: string, now = new Date()): Promise<number> {
    try {
      const { start, end } = utcDayBounds(now);
      return this.prisma.swipeLog.count({
        where: {
          user_id: userId,
          direction: SwipeDirection.RIGHT,
          swiped_at: { gte: start, lt: end },
        },
      });
    } catch (err) {
      throw err;
    }
  }

  async buildQuotaSnapshot(userId: string): Promise<SwipeQuota> {
    try {
      const { plan, limit, unlimited } = await this.resolveSwipeQuota(userId);
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
      const used = await this.countTodayRightSwipes(userId);
      return {
        plan,
        unlimited: false,
        used,
        limit,
        remaining: Math.max(0, (limit ?? 0) - used),
        resets_at: 'midnight_utc',
      };
    } catch (err) {
      throw err;
    }
  }
}
