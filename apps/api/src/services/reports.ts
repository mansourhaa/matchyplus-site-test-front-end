import { Prisma, PrismaClient, ReportStatus, Role } from '@saas-boilerplate/types';

import { AdminActor } from '../types/admin.js';
import {
  AdminListReportsQuery,
  AdminUpdateReportPayload,
  CreateReportPayload,
} from '../types/report.js';
import { AbstractServiceOptions } from '../types/services.js';
import { badRequest, conflict, notFound } from '../utils/http-errors.js';
import { assertMinimumRole } from '../utils/roles.js';

/** Never expose a password; both sides of a report are shown to the admin as public identity. */
const partySelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  status: true,
  city: true,
  job: true,
} satisfies Prisma.UserSelect;

const reportSelect = {
  id: true,
  reason: true,
  details: true,
  status: true,
  create_at: true,
  updated_at: true,
  reporter: { select: partySelect },
  reported: { select: partySelect },
} satisfies Prisma.ReportSelect;

/**
 * What the reporter gets back: an acknowledgement, never anything about the reported party.
 * The identities in `reportSelect` are for the admin sections only.
 */
const reportAckSelect = {
  id: true,
  status: true,
} satisfies Prisma.ReportSelect;

/**
 * One report per reporter, per target, per window. Re-filing the same complaint only floods
 * the moderation queue and inflates the per-user rollup that admins triage by, so a target
 * could be buried under reports from a single account. A genuinely new incident can still be
 * reported once the window has passed, which a plain unique constraint would forbid forever.
 */
const REPORT_COOLDOWN_HOURS = 24;

export class ReportsService {
  prisma: PrismaClient;
  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  /**
   * A user files a report against another profile. Self-reports are refused, and the reported
   * account must exist. This is the "utilisateur signale" half of the loop.
   */
  async createReport(reporterId: string, reportedId: string, payload: CreateReportPayload) {
    if (reporterId === reportedId) {
      throw badRequest('cannot report yourself');
    }

    const reported = await this.prisma.user.findUnique({
      where: { id: reportedId },
      select: { id: true },
    });
    if (!reported) {
      throw notFound('reported user not found');
    }

    const since = new Date(Date.now() - REPORT_COOLDOWN_HOURS * 60 * 60 * 1000);
    const recent = await this.prisma.report.findFirst({
      where: { reporter_id: reporterId, reported_id: reportedId, create_at: { gte: since } },
      select: { id: true },
    });
    if (recent) {
      throw conflict('a report against this user was already filed recently');
    }

    const report = await this.prisma.report.create({
      data: {
        reporter_id: reporterId,
        reported_id: reportedId,
        reason: payload.reason,
        details: payload.details,
      },
      select: reportAckSelect,
    });

    return { reportId: report.id, status: report.status };
  }

  async listReports(query: AdminListReportsQuery) {
    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.reportedId) where.reported_id = query.reportedId;

    return this.prisma.report.findMany({
      where,
      select: reportSelect,
      orderBy: { create_at: 'desc' },
    });
  }

  /**
   * Per-reported-user rollup for the admin section: who is being reported, how many times, and
   * how many are still pending — the "admin reçoit" overview before drilling into each report.
   */
  async getReportSummary() {
    const grouped = await this.prisma.report.groupBy({
      by: ['reported_id'],
      _count: { _all: true },
      orderBy: { _count: { reported_id: 'desc' } },
    });

    const reportedIds = grouped.map((entry) => entry.reported_id);
    const [reported, pendingByUser] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: reportedIds } }, select: partySelect }),
      this.prisma.report.groupBy({
        by: ['reported_id'],
        where: { status: ReportStatus.PENDING },
        _count: { _all: true },
      }),
    ]);

    const userById = new Map(reported.map((user) => [user.id, user]));
    const pendingById = new Map(
      pendingByUser.map((entry) => [entry.reported_id, entry._count._all]),
    );

    return grouped
      .map((entry) => {
        const user = userById.get(entry.reported_id);
        if (!user) return null;
        return {
          reported: user,
          total: entry._count._all,
          pending: pendingById.get(entry.reported_id) ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }

  /**
   * Ruling on a report is a moderation decision — it is what clears or confirms a flag against
   * a member — so it starts at MODERATOR. SUPPORT can still read the queue to triage it.
   */
  async updateReportStatus(actor: AdminActor, id: string, payload: AdminUpdateReportPayload) {
    assertMinimumRole(actor.role, Role.MODERATOR);

    try {
      return await this.prisma.report.update({
        where: { id },
        data: { status: payload.status },
        select: reportSelect,
      });
    } catch (err) {
      throw notFound('report not found');
    }
  }
}
