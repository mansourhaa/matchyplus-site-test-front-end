import { PrismaClient, UserPlan } from '@saas-boilerplate/types';

import { MessageQuota } from '../types/conversations.js';
import { AbstractServiceOptions } from '../types/services.js';
import { utcDayBounds } from '../utils/utc-day.js';

/**
 * Plan limits + UTC-day message counts.
 * Quota is always re-read from Message rows after writes — never trust an in-memory counter.
 */
export class MessageQuotaService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  /** Daily message allowance from Plan.messages_per_day (-1 = unlimited). */
  async resolveMessageQuota(
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
        select: { messages_per_day: true },
      });

      const messagesPerDay = planRow?.messages_per_day ?? -1;
      if (messagesPerDay < 0) {
        return { plan, limit: null, unlimited: true };
      }
      return { plan, limit: messagesPerDay, unlimited: false };
    } catch (err) {
      throw err;
    }
  }

  async countTodayMessages(userId: string, now = new Date()): Promise<number> {
    try {
      const { start, end } = utcDayBounds(now);
      return this.prisma.message.count({
        where: {
          sender_id: userId,
          created_at: { gte: start, lt: end },
        },
      });
    } catch (err) {
      throw err;
    }
  }

  async buildQuotaSnapshot(userId: string): Promise<MessageQuota> {
    try {
      const { plan, limit, unlimited } = await this.resolveMessageQuota(userId);
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
      const used = await this.countTodayMessages(userId);
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
