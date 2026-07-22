import { describe, expect, it, vi } from 'vitest';

import { ReportsService } from './reports.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    report: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
  };
}

describe('ReportsService', () => {
  it('refuses a self-report without touching the database', async () => {
    const prisma = createMockPrisma();
    const service = new ReportsService({ prisma: prisma as never });

    await expect(service.createReport('u1', 'u1', { reason: 'x' })).rejects.toThrow(
      'cannot report yourself',
    );
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('refuses a report against a non-existent user', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new ReportsService({ prisma: prisma as never });

    await expect(service.createReport('u1', 'ghost', { reason: 'x' })).rejects.toThrow(
      'reported user not found',
    );
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('records the reporter and reported ids on create', async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u2' });
    prisma.report.create.mockResolvedValue({ id: 'r1', status: 'PENDING' });
    const service = new ReportsService({ prisma: prisma as never });

    const result = await service.createReport('u1', 'u2', { reason: 'Faux profil', details: 'd' });

    const { data, select } = prisma.report.create.mock.calls[0][0];
    expect(data).toMatchObject({ reporter_id: 'u1', reported_id: 'u2', reason: 'Faux profil' });
    // The reporter only gets an acknowledgement: no identity of either party is joined in.
    expect(select).not.toHaveProperty('reporter');
    expect(select).not.toHaveProperty('reported');
    expect(select).not.toHaveProperty('password');
    expect(result).toEqual({ reportId: 'r1', status: 'PENDING' });
  });

  it('never selects a password on the reporter or reported party', async () => {
    const prisma = createMockPrisma();
    prisma.report.findMany.mockResolvedValue([]);
    const service = new ReportsService({ prisma: prisma as never });

    await service.listReports({});

    const { select } = prisma.report.findMany.mock.calls[0][0];
    expect(select.reporter.select).not.toHaveProperty('password');
    expect(select.reported.select).not.toHaveProperty('password');
  });

  it('filters the admin list by status and reported user', async () => {
    const prisma = createMockPrisma();
    prisma.report.findMany.mockResolvedValue([]);
    const service = new ReportsService({ prisma: prisma as never });

    await service.listReports({ status: 'PENDING', reportedId: 'u2' } as never);

    const { where } = prisma.report.findMany.mock.calls[0][0];
    expect(where).toEqual({ status: 'PENDING', reported_id: 'u2' });
  });

  it('rolls up reports per reported user with totals and pending counts', async () => {
    const prisma = createMockPrisma();
    prisma.report.groupBy
      .mockResolvedValueOnce([
        { reported_id: 'u2', _count: { _all: 3 } },
        { reported_id: 'u3', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([{ reported_id: 'u2', _count: { _all: 2 } }]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u2',
        name: 'Riadh',
        email: 'r@x.tn',
        image: null,
        status: 'BANNED',
        city: null,
        job: null,
      },
      {
        id: 'u3',
        name: 'Bilel',
        email: 'b@x.tn',
        image: null,
        status: 'ACTIVE',
        city: null,
        job: null,
      },
    ]);
    const service = new ReportsService({ prisma: prisma as never });

    const summary = await service.getReportSummary();

    expect(summary).toEqual([
      { reported: expect.objectContaining({ id: 'u2', name: 'Riadh' }), total: 3, pending: 2 },
      { reported: expect.objectContaining({ id: 'u3', name: 'Bilel' }), total: 1, pending: 0 },
    ]);
  });

  it('throws a not-found when updating a missing report', async () => {
    const prisma = createMockPrisma();
    prisma.report.update.mockRejectedValue(new Error('no row'));
    const service = new ReportsService({ prisma: prisma as never });

    await expect(
      service.updateReportStatus({ id: 'm1', role: 'MODERATOR' } as never, 'ghost', {
        status: 'RESOLVED',
      } as never),
    ).rejects.toThrow('report not found');
  });

  it('refuses to let a SUPPORT rule on a report', async () => {
    const prisma = createMockPrisma();
    const service = new ReportsService({ prisma: prisma as never });

    const rejection = service.updateReportStatus({ id: 's1', role: 'SUPPORT' } as never, 'r1', {
      status: 'DISMISSED',
    } as never);

    await expect(rejection).rejects.toThrow('insufficient privileges');
    await expect(rejection).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it.each(['MODERATOR', 'SUPER_ADMIN'])('lets a %s rule on a report', async (role) => {
    const prisma = createMockPrisma();
    prisma.report.update.mockResolvedValue({ id: 'r1', status: 'RESOLVED' });
    const service = new ReportsService({ prisma: prisma as never });

    await service.updateReportStatus({ id: 'a1', role } as never, 'r1', {
      status: 'RESOLVED',
    } as never);

    expect(prisma.report.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'r1' },
      data: { status: 'RESOLVED' },
    });
  });
});
