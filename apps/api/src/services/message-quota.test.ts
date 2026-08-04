import { describe, expect, it, vi } from 'vitest';

import { UserPlan } from '@saas-boilerplate/types';

import { MessageQuotaService } from './message-quota.js';

function createMockPrisma() {
  return {
    user: { findUnique: vi.fn() },
    plan: { findUnique: vi.fn() },
    message: { count: vi.fn() },
  };
}

describe('MessageQuotaService', () => {
  it('treats messages_per_day < 0 as unlimited', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ plan: UserPlan.PREMIUM });
    prisma.plan.findUnique.mockResolvedValue({ messages_per_day: -1 });

    const service = new MessageQuotaService({ prisma: prisma as never });
    const snapshot = await service.buildQuotaSnapshot('u1');

    expect(snapshot).toEqual({
      plan: UserPlan.PREMIUM,
      unlimited: true,
      used: null,
      limit: null,
      remaining: null,
      resets_at: 'midnight_utc',
    });
    expect(prisma.message.count).not.toHaveBeenCalled();
  });

  it('counts used messages against the daily limit', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ plan: UserPlan.FREE });
    prisma.plan.findUnique.mockResolvedValue({ messages_per_day: 10 });
    prisma.message.count.mockResolvedValue(3);

    const service = new MessageQuotaService({ prisma: prisma as never });
    const snapshot = await service.buildQuotaSnapshot('u1');

    expect(snapshot).toMatchObject({
      plan: UserPlan.FREE,
      unlimited: false,
      used: 3,
      limit: 10,
      remaining: 7,
      resets_at: 'midnight_utc',
    });
  });
});
