import { describe, expect, it, vi } from 'vitest';

import { AdminService } from './admin.js';

function createMockPrisma() {
  return {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    plan: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('AdminService', () => {
  it('filters users by status, plan and a case-insensitive search', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const service = new AdminService({ prisma: prisma as never });
    await service.listUsers({ search: 'karim', status: 'BANNED', plan: 'FREE' } as never);

    const { where } = prisma.user.findMany.mock.calls[0][0];
    expect(where.status).toBe('BANNED');
    expect(where.plan).toBe('FREE');
    expect(where.OR).toEqual([
      { name: { contains: 'karim', mode: 'insensitive' } },
      { email: { contains: 'karim', mode: 'insensitive' } },
      { job: { contains: 'karim', mode: 'insensitive' } },
    ]);
  });

  it('never selects the password column', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const service = new AdminService({ prisma: prisma as never });
    await service.listUsers({});

    const { select } = prisma.user.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty('password');
    expect(select.email).toBe(true);
  });

  it('ignores fields that are not admin-editable', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: 'u1' });

    const service = new AdminService({ prisma: prisma as never });
    await service.updateUser({ id: 'a1', role: 'SUPER_ADMIN' } as never, 'u1', {
      city: 'Tunis',
      role: 'SUPER_ADMIN',
      rating: 9999,
    } as never);

    const { data } = prisma.user.update.mock.calls[0][0];
    expect(data).toEqual({ city: 'Tunis' });
  });

  it('refuses to let a lower role act on a higher one', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.updateUserStatus({ id: 's1', role: 'SUPPORT' } as never, 'sa1', 'BANNED' as never),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to let a role act on a peer', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'm2', role: 'MODERATOR' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.updateUserStatus({ id: 'm1', role: 'MODERATOR' } as never, 'm2', 'BANNED' as never),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to let an admin act on their own account', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.updateUserStatus(
        { id: 'sa1', role: 'SUPER_ADMIN' } as never,
        'sa1',
        'BANNED' as never,
      ),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('lets a moderator ban a regular member', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.update.mockResolvedValue({ id: 'u1', status: 'BANNED' });

    const service = new AdminService({ prisma: prisma as never });
    await service.updateUserStatus(
      { id: 'm1', role: 'MODERATOR' } as never,
      'u1',
      'BANNED' as never,
    );

    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: 'u1' });
    expect(data).toEqual({ status: 'BANNED' });
  });

  it('refuses to delete an admin account', async () => {
    const prisma = createMockPrisma();
    // A target the actor does outrank, so the refusal comes from the admin-account rule
    // rather than from the hierarchy guard in front of it.
    prisma.user.findUnique.mockResolvedValue({ id: 'm1', role: 'MODERATOR' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.deleteUser({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'm1'),
    ).rejects.toThrow('cannot delete an admin account');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('deletes a regular member', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' });
    prisma.user.delete.mockResolvedValue({ id: 'u1' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.deleteUser({ id: 'm1', role: 'MODERATOR' } as never, 'u1'),
    ).resolves.toEqual({ deleted: true });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('refuses to let a lower role delete a peer or a superior', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(service.deleteUser({ id: 's1', role: 'SUPPORT' } as never, 'sa1')).rejects.toThrow(
      'insufficient privileges',
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to let an admin delete their own account', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'sa1', role: 'SUPER_ADMIN' });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.deleteUser({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'sa1'),
    ).rejects.toThrow('insufficient privileges');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('reports zero for statuses and plans with no rows', async () => {
    const prisma = createMockPrisma();
    prisma.user.count.mockResolvedValue(2);
    prisma.user.groupBy
      .mockResolvedValueOnce([{ status: 'ACTIVE', _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ plan: 'FREE', _count: { _all: 2 } }]);

    const service = new AdminService({ prisma: prisma as never });

    await expect(service.getStats()).resolves.toEqual({
      totalUsers: 2,
      activeUsers: 2,
      inactiveUsers: 0,
      bannedUsers: 0,
      freeUsers: 2,
      premiumUsers: 0,
      premiumPlusUsers: 0,
    });
  });
});

describe('AdminService plan management', () => {
  it.each(['SUPPORT', 'MODERATOR'])('refuses to let a %s edit a plan', async (role) => {
    const prisma = createMockPrisma();
    const service = new AdminService({ prisma: prisma as never });

    const rejection = service.updatePlan({ id: 'a1', role } as never, 'PREMIUM' as never, {
      price: 0,
    });

    await expect(rejection).rejects.toThrow('insufficient privileges');
    await expect(rejection).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.plan.update).not.toHaveBeenCalled();
  });

  it('lets a super admin edit a plan', async () => {
    const prisma = createMockPrisma();
    prisma.plan.update.mockResolvedValue({ id: 'PREMIUM', price: 12.9 });

    const service = new AdminService({ prisma: prisma as never });
    await service.updatePlan({ id: 'sa1', role: 'SUPER_ADMIN' } as never, 'PREMIUM' as never, {
      price: 12.9,
    });

    expect(prisma.plan.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'PREMIUM' },
      data: { price: 12.9 },
    });
  });
});

describe('AdminService analytics', () => {
  const members = [
    {
      category: 'Ménage',
      city: 'Tunis',
      matches: 89,
      plan: 'FREE',
      create_at: new Date('2026-06-04'),
    },
    {
      category: 'Ménage',
      city: 'Tunis',
      matches: 11,
      plan: 'PREMIUM',
      create_at: new Date('2026-07-02'),
    },
    {
      category: 'Plomberie',
      city: 'Ariana',
      matches: 8,
      plan: 'PREMIUM_PLUS',
      create_at: new Date('2026-07-09'),
    },
    { category: null, city: null, matches: 3, plan: 'FREE', create_at: new Date('2026-07-11') },
  ];

  const plans = [
    { id: 'FREE', name: 'Gratuit', price: 0, sort_order: 0 },
    { id: 'PREMIUM', name: 'Premium', price: 9.9, sort_order: 1 },
    { id: 'PREMIUM_PLUS', name: 'Premium+', price: 19.9, sort_order: 2 },
  ];

  function serviceWithData() {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue(members);
    prisma.plan.findMany.mockResolvedValue(plans);
    return new AdminService({ prisma: prisma as never });
  }

  it('estimates revenue as plan price times subscriber count, ignoring the free plan', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.revenueByPlan).toEqual([
      { plan: 'Premium', users: 1, monthlyRevenue: 9.9 },
      { plan: 'Premium+', users: 1, monthlyRevenue: 19.9 },
    ]);
    expect(result.estimatedMonthlyRevenue).toBe(29.8);
  });

  it('builds a continuous cumulative platform timeline, filling gap months', async () => {
    const result = await serviceWithData().getAnalytics();

    // Signups land in 2026-06 (1 free) and 2026-07 (premium+premium_plus+free). July is a
    // single month here, so the running totals accumulate across the two present months.
    expect(result.platformTimeline).toEqual([
      { month: '2026-06', users: 1, revenue: 0 },
      { month: '2026-07', users: 4, revenue: 29.8 },
    ]);
  });

  it('carries the running total across months with no signups', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([
      { category: 'A', city: 'X', matches: 0, plan: 'PREMIUM', create_at: new Date('2026-01-10') },
      { category: 'A', city: 'X', matches: 0, plan: 'PREMIUM', create_at: new Date('2026-03-10') },
    ]);
    prisma.plan.findMany.mockResolvedValue(plans);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();

    // February has no signups but must still appear, carrying January's cumulative total.
    expect(result.platformTimeline).toEqual([
      { month: '2026-01', users: 1, revenue: 9.9 },
      { month: '2026-02', users: 1, revenue: 9.9 },
      { month: '2026-03', users: 2, revenue: 19.8 },
    ]);
  });

  it('computes real month-over-month trends, including a diluted conversion', async () => {
    const prisma = createMockPrisma();
    // June: 4 paying members (100% conversion). July: 1 free member joins (0 matches, 0 revenue).
    prisma.user.findMany.mockResolvedValue([
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-01') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-02') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-03') },
      { category: 'A', city: 'X', matches: 10, plan: 'PREMIUM', create_at: new Date('2026-06-04') },
      { category: 'A', city: 'X', matches: 0, plan: 'FREE', create_at: new Date('2026-07-01') },
    ]);
    prisma.plan.findMany.mockResolvedValue(plans);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();

    expect(result.trends).toEqual({
      users: 25, // 4 → 5
      revenue: 0, // free member adds nothing
      matches: 0, // free member adds no matches
      conversion: -20, // 100% → 80%
    });
  });

  it('returns null trends when there is only one month of data', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([
      { category: 'A', city: 'X', matches: 1, plan: 'PREMIUM', create_at: new Date('2026-07-01') },
    ]);
    prisma.plan.findMany.mockResolvedValue(plans);

    const result = await new AdminService({ prisma: prisma as never }).getAnalytics();
    expect(result.trends).toBeNull();
  });

  it('groups signups by calendar month, oldest first', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.signupsTimeline).toEqual([
      { month: '2026-06', users: 1 },
      { month: '2026-07', users: 3 },
    ]);
  });

  it('sums matches per category and skips members with no category', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.matchesByCategory).toEqual([
      { name: 'Ménage', value: 100 },
      { name: 'Plomberie', value: 8 },
    ]);
    // Every member counts toward the total, including the uncategorised one.
    expect(result.totalMatches).toBe(111);
  });

  it('counts categories and cities, ignoring blanks', async () => {
    const result = await serviceWithData().getAnalytics();

    expect(result.categoryDistribution).toEqual([
      { name: 'Ménage', value: 2 },
      { name: 'Plomberie', value: 1 },
    ]);
    expect(result.topCities).toEqual([
      { city: 'Tunis', users: 2 },
      { city: 'Ariana', users: 1 },
    ]);
  });

  it('excludes admin accounts from analytics', async () => {
    const prisma = createMockPrisma();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.plan.findMany.mockResolvedValue(plans);

    await new AdminService({ prisma: prisma as never }).getAnalytics();

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'USER' });
  });
});

describe('AdminService password change', () => {
  async function hash(password: string) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 10);
  }

  it('rejects a wrong current password without writing', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'a1', password: await hash('matchy2026') });

    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.changePassword('a1', { currentPassword: 'nope', newPassword: 'newpass2026' }),
    ).rejects.toThrow('invalid current password');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a short new password before touching the database', async () => {
    const prisma = createMockPrisma();
    const service = new AdminService({ prisma: prisma as never });

    await expect(
      service.changePassword('a1', { currentPassword: 'matchy2026', newPassword: 'short' }),
    ).rejects.toThrow('password too short');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('stores the new password hashed, never in clear text', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'a1', password: await hash('matchy2026') });
    prisma.user.update.mockResolvedValue({ id: 'a1' });

    const service = new AdminService({ prisma: prisma as never });
    await service.changePassword('a1', {
      currentPassword: 'matchy2026',
      newPassword: 'newpass2026',
    });

    const stored = prisma.user.update.mock.calls[0][0].data.password;
    expect(stored).not.toBe('newpass2026');
    const bcrypt = await import('bcryptjs');
    await expect(bcrypt.compare('newpass2026', stored)).resolves.toBe(true);
  });
});
