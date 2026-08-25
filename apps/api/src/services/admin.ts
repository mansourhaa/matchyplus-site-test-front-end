import bcrypt from 'bcryptjs';

import { Prisma, PrismaClient, Role, UserPlan, UserStatus } from '@saas-boilerplate/types';

import { normalizePhoneForAuth } from '../lib/phone.js';
import {
  AdminActor,
  AdminAnalyticsResult,
  AdminChangePasswordPayload,
  AdminCreateUserPayload,
  AdminListUsersQuery,
  AdminUpdatePlanPayload,
  AdminUpdateUserPayload,
  AdminUserStatsResult,
  adminUserSelect,
} from '../types/admin.js';
import { AbstractServiceOptions } from '../types/services.js';
import { badRequest, forbidden, insufficientPrivileges, notFound } from '../utils/http-errors.js';
import { filenameFromStoredPath, isStoredMediaPath } from '../utils/media-storage.js';
import { isPasswordPolicySatisfied } from '../utils/password-policy.js';
import { assertMinimumRole, outranks, rolesBelow } from '../utils/roles.js';
import { TokenService } from './token.js';

/** "2026-01" plus n months, still as "YYYY-MM". */
function addMonth(month: string, n: number): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, m - 1 + n, 1));
  return date.toISOString().slice(0, 7);
}

type CumulativePoint = {
  month: string;
  users: number;
  revenue: number;
  matches: number;
  paying: number;
};

/**
 * Turns per-month "new X" maps into a continuous cumulative series from the earliest to the
 * latest month, carrying the running totals across gap months so the curves are monotonic and
 * never break. Everything is bucketed by member join-month.
 */
function buildCumulativeTimeline(
  signups: Map<string, number>,
  newRevenue: Map<string, number>,
  newMatches: Map<string, number>,
  newPaying: Map<string, number>,
): CumulativePoint[] {
  const months = Array.from(signups.keys()).sort();
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return [];

  const timeline: CumulativePoint[] = [];
  let users = 0;
  let revenue = 0;
  let matches = 0;
  let paying = 0;

  for (let month = first; month <= last; month = addMonth(month, 1)) {
    users += signups.get(month) ?? 0;
    revenue += newRevenue.get(month) ?? 0;
    matches += newMatches.get(month) ?? 0;
    paying += newPaying.get(month) ?? 0;
    timeline.push({ month, users, revenue: Math.round(revenue * 100) / 100, matches, paying });
  }

  return timeline;
}

/** Month-over-month relative change, in percent (1 decimal). */
function monthOverMonthChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Real trend badges for the dashboard: each metric's change between the last month and the one
 * before it, derived from the cumulative series. Null when there is less than two months of data
 * (no honest comparison to make).
 */
function computeTrends(timeline: CumulativePoint[]): AdminAnalyticsResult['trends'] {
  if (timeline.length < 2) return null;

  const last = timeline[timeline.length - 1]!;
  const prev = timeline[timeline.length - 2]!;
  const conversion = (point: CumulativePoint) =>
    point.users === 0 ? 0 : point.paying / point.users;

  return {
    users: monthOverMonthChange(last.users, prev.users),
    revenue: monthOverMonthChange(last.revenue, prev.revenue),
    matches: monthOverMonthChange(last.matches, prev.matches),
    conversion: monthOverMonthChange(conversion(last), conversion(prev)),
  };
}

/**
 * Fields an admin is allowed to edit from the user detail panel. `plan` is deliberately
 * excluded: assigning a paid tier is a control-plane action, and leaving it here let any
 * admin who merely outranks the target grant premium through this generic update path,
 * sidestepping the SUPER_ADMIN gate that guards plan management.
 */
const editableFields = [
  'name',
  'email',
  'phone',
  'job',
  'category',
  'city',
  'bio',
  'experience',
  'schedule',
  'price',
  'status',
] as const;

export class AdminService {
  prisma: PrismaClient;
  tokenService: TokenService;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
    this.tokenService = new TokenService({ prisma: options.prisma });
  }

  async listUsers(actor: AdminActor, query: AdminListUsersQuery) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));

    // Reads follow the same hierarchy as writes. Without this a SUPPORT could page through
    // a SUPER_ADMIN's profile — email, phone, last login — even though every write against
    // that row is refused.
    const where: Prisma.UserWhereInput = { role: { in: rolesBelow(actor.role) } };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { job: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.plan) where.plan = query.plan;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: { create_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Creates a member account in one shot — same end state as a real phone signup that
   * finished onboarding, minus the OTP step (the admin vouches for the phone instead)..
   */
  async createUser(payload: AdminCreateUserPayload) {
    const phone = normalizePhoneForAuth(payload.phone);
    if (!phone) {
      throw badRequest('invalid phone number', 'invalid_phone');
    }

    if (await this.prisma.user.findUnique({ where: { phone } })) {
      throw badRequest('phone already registered', 'phone_already_registered');
    }

    if (payload.email) {
      const email = payload.email.toLowerCase();
      if (await this.prisma.user.findUnique({ where: { email } })) {
        throw badRequest('email already registered', 'email_already_registered');
      }
    }

    if (!isPasswordPolicySatisfied(payload.password)) {
      throw badRequest('password does not meet the security policy', 'weak_password');
    }

    const name = payload.name.trim();
    if (!name) {
      throw badRequest('name is required', 'invalid_name');
    }

    // Same completeness contract as a real onboarding finish (OnboardingService.completeOnboarding)
    // — this account skips the wizard entirely, so it must be enforced here instead.
    const isIndividual = payload.profileType === 'INDIVIDUAL';
    if (isIndividual && !payload.job?.trim()) {
      throw badRequest('job is required for an individual profile', 'onboarding_incomplete');
    }
    if (!payload.interests?.length) {
      throw badRequest('at least one interest is required', 'onboarding_incomplete');
    }
    if (!payload.selectedGoals?.length) {
      throw badRequest('at least one goal is required', 'onboarding_incomplete');
    }
    if (payload.offerService && (!payload.serviceType?.trim() || !payload.price?.trim())) {
      throw badRequest(
        'service type and price are required when offering a service',
        'onboarding_incomplete',
      );
    }
    // A brand-new account can never already own a real uploaded file — only a base64
    // data URL (or none) is a legal `image` value here, same guard OnboardingService
    // applies when a member tries to set someone else's stored photo path as their own.
    if (payload.image && isStoredMediaPath(payload.image)) {
      throw badRequest('image must be a newly uploaded photo, not a stored path', 'invalid_image');
    }

    const hashedPassword = await bcrypt.hash(payload.password, await bcrypt.genSalt(10));

    const user = await this.prisma.user.create({
      data: {
        name,
        phone,
        email: payload.email?.toLowerCase(),
        password: hashedPassword,
        auth_provider: 'phone',
        phone_verified: true,
        plan: payload.plan ?? UserPlan.FREE,
        job: payload.job,
        bio: payload.bio,
        image: payload.image,
        city: payload.city,
        profile_type: payload.profileType,
        offer_service: payload.offerService ?? false,
        service_type: payload.offerService ? payload.serviceType : undefined,
        price: payload.offerService ? payload.price : undefined,
        interests: payload.interests,
        selected_goals: payload.selectedGoals,
        availability_days: payload.availabilityDays ?? [],
        availability_hours: payload.availabilityHours ?? [],
        contact_modes: payload.contactModes ?? [],
        languages: payload.languages ?? [],
        experience: isIndividual ? payload.experience : undefined,
        sector: payload.sector,
        education_level: payload.educationLevel,
        experiences: payload.experiences,
        educations: payload.educations,
        onboarding_completed_at: new Date(),
      },
      select: adminUserSelect,
    });

    return user;
  }

  /** Same hierarchy as the writes: an admin only opens a profile they could act on. */
  async getUserById(actor: AdminActor, id: string) {
    await this.assertCanManage(actor, id);

    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: { id },
        select: adminUserSelect,
      });
    } catch (err) {
      throw notFound('user not found');
    }
  }

  /**
   * The admin session is a separate audience from the member session that guards
   * GET /profiles/media/photos/:filename, so the panel can never reuse that route directly —
   * it needs its own, gated by the same hierarchy as every other admin read of a user's data.
   */
  async getUserPhotoFilename(actor: AdminActor, id: string): Promise<string> {
    await this.assertCanManage(actor, id);

    const target = await this.prisma.user.findUnique({ where: { id }, select: { image: true } });
    if (!target || !isStoredMediaPath(target.image, 'photos')) {
      throw notFound('photo not found', 'photo_not_found');
    }
    return filenameFromStoredPath(target.image);
  }

  /**
   * Guards every write against another account: an admin may only act on someone strictly
   * below them in the hierarchy, and never on their own row. Without this a SUPPORT could ban
   * or re-address a SUPER_ADMIN, since `verifyAdmin` only checks that the caller is *an* admin.
   */
  private async assertCanManage(actor: AdminActor, targetId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });

    if (!target) {
      throw notFound('user not found');
    }

    if (target.id === actor.id || !outranks(actor.role, target.role)) {
      throw insufficientPrivileges();
    }
  }

  async updateUser(actor: AdminActor, id: string, payload: AdminUpdateUserPayload) {
    await this.assertCanManage(actor, id);

    const data: Prisma.UserUpdateInput = {};

    for (const field of editableFields) {
      const value = payload[field];
      if (value !== undefined) {
        // Each key is narrowed by `editableFields`, but TS cannot track that across the loop.
        (data as Record<string, unknown>)[field] = value;
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: adminUserSelect,
      });
    } catch (err) {
      throw notFound('user not found');
    }
  }

  async updateUserStatus(actor: AdminActor, id: string, status: UserStatus) {
    await this.assertCanManage(actor, id);

    try {
      return await this.prisma.user.update({
        where: { id },
        data: { status },
        select: adminUserSelect,
      });
    } catch (err) {
      throw notFound('user not found');
    }
  }

  /**
   * Admin accounts are deleted through the same panel they log in from, so refuse to
   * remove one — an admin must not be able to delete themselves or a peer by accident.
   * Deleting is at least as destructive as banning, so it goes through the same hierarchy
   * guard as `updateUserStatus` rather than being open to any admin.
   */
  async deleteUser(actor: AdminActor, id: string) {
    await this.assertCanManage(actor, id);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      throw notFound('user not found');
    }

    if (user.role !== Role.USER) {
      throw forbidden('cannot delete an admin account');
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async getStats(actor: AdminActor): Promise<AdminUserStatsResult> {
    const where: Prisma.UserWhereInput = { role: { in: rolesBelow(actor.role) } };
    const [totalUsers, byStatus, byPlan] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['plan'], where, _count: { _all: true } }),
    ]);

    const statusCount = (status: UserStatus) =>
      byStatus.find((entry) => entry.status === status)?._count._all ?? 0;
    const planCount = (plan: UserPlan) =>
      byPlan.find((entry) => entry.plan === plan)?._count._all ?? 0;

    return {
      totalUsers,
      activeUsers: statusCount(UserStatus.ACTIVE),
      inactiveUsers: statusCount(UserStatus.INACTIVE),
      bannedUsers: statusCount(UserStatus.BANNED),
      freeUsers: planCount(UserPlan.FREE),
      premiumUsers: planCount(UserPlan.PREMIUM),
      premiumPlusUsers: planCount(UserPlan.PREMIUM_PLUS),
    };
  }

  async listPlans() {
    return this.prisma.plan.findMany({ orderBy: { sort_order: 'asc' } });
  }

  /**
   * Plan configuration is the control plane — price, limits and trial length apply to every
   * member at once, and raising a member to premium is a paid entitlement. That is above
   * day-to-day moderation, so it is reserved to SUPER_ADMIN.
   */
  async updatePlan(actor: AdminActor, id: UserPlan, payload: AdminUpdatePlanPayload) {
    assertMinimumRole(actor.role, Role.SUPER_ADMIN);

    try {
      return await this.prisma.plan.update({ where: { id }, data: payload });
    } catch (err) {
      throw notFound('plan not found');
    }
  }

  /**
   * Everything here is aggregated from rows that actually exist. There is no billing or
   * matching model yet, so revenue is an estimate of monthly recurring value
   * (plan price × subscribers) and `matches` is the denormalised counter on User.
   */
  async getAnalytics(): Promise<AdminAnalyticsResult> {
    const [users, plans] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.USER },
        select: { category: true, city: true, matches: true, plan: true, create_at: true },
      }),
      this.prisma.plan.findMany({ orderBy: { sort_order: 'asc' } }),
    ]);

    const tally = <T extends string>(rows: (T | null)[]) => {
      const counts = new Map<string, number>();
      rows.forEach((row) => {
        const key = row?.trim();
        if (!key) return;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
      return counts;
    };

    const categoryCounts = tally(users.map((user) => user.category));
    const cityCounts = tally(users.map((user) => user.city));

    const matchesByCategory = new Map<string, number>();
    users.forEach((user) => {
      const key = user.category?.trim();
      if (!key) return;
      matchesByCategory.set(key, (matchesByCategory.get(key) ?? 0) + user.matches);
    });

    const planPrice = new Map(plans.map((plan) => [plan.id, plan.price]));

    // Per join-month tallies, keyed YYYY-MM.
    const signups = new Map<string, number>();
    const newRevenue = new Map<string, number>();
    const newMatches = new Map<string, number>();
    const newPaying = new Map<string, number>();
    users.forEach((user) => {
      const month = user.create_at.toISOString().slice(0, 7);
      signups.set(month, (signups.get(month) ?? 0) + 1);
      newRevenue.set(month, (newRevenue.get(month) ?? 0) + (planPrice.get(user.plan) ?? 0));
      newMatches.set(month, (newMatches.get(month) ?? 0) + user.matches);
      if (user.plan !== UserPlan.FREE) {
        newPaying.set(month, (newPaying.get(month) ?? 0) + 1);
      }
    });

    // "Évolution de la plateforme": a continuous month-by-month cumulative series, filling any
    // gap months so the lines never break. Trend badges are the last month vs the one before.
    const cumulative = buildCumulativeTimeline(signups, newRevenue, newMatches, newPaying);
    const platformTimeline = cumulative.map(({ month, users: u, revenue }) => ({
      month,
      users: u,
      revenue,
    }));
    const trends = computeTrends(cumulative);

    // Per-plan subscriber growth, month-over-month — this doubles as each paid plan's revenue
    // trend too, since a plan's monthly revenue is just its subscriber count × a fixed price.
    // Computed over the same month range as the platform timeline, so a plan with zero new
    // subscribers this month still carries its prior cumulative total forward correctly.
    const months = cumulative.map((point) => point.month);
    const newSubscribersByPlan = new Map<UserPlan, Map<string, number>>();
    users.forEach((user) => {
      const month = user.create_at.toISOString().slice(0, 7);
      const perMonth = newSubscribersByPlan.get(user.plan) ?? new Map<string, number>();
      perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
      newSubscribersByPlan.set(user.plan, perMonth);
    });

    const planTrend = (planId: UserPlan): number | null => {
      if (months.length < 2) return null;
      const perMonth = newSubscribersByPlan.get(planId);
      let running = 0;
      let previous = 0;
      let current = 0;
      months.forEach((month, index) => {
        running += perMonth?.get(month) ?? 0;
        if (index === months.length - 2) previous = running;
        if (index === months.length - 1) current = running;
      });
      return monthOverMonthChange(current, previous);
    };

    const planTrends: AdminAnalyticsResult['planTrends'] = {
      [UserPlan.FREE]: planTrend(UserPlan.FREE),
      [UserPlan.PREMIUM]: planTrend(UserPlan.PREMIUM),
      [UserPlan.PREMIUM_PLUS]: planTrend(UserPlan.PREMIUM_PLUS),
    };

    const planCount = (plan: UserPlan) => users.filter((user) => user.plan === plan).length;

    const revenueByPlan = plans
      .filter((plan) => plan.id !== UserPlan.FREE)
      .map((plan) => {
        const subscribers = planCount(plan.id);
        return {
          plan: plan.name,
          users: subscribers,
          monthlyRevenue: Math.round(subscribers * plan.price * 100) / 100,
        };
      });

    const byValueDesc = (a: { value: number }, b: { value: number }) => b.value - a.value;

    return {
      signupsTimeline: Array.from(signups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, users: count })),
      categoryDistribution: Array.from(categoryCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort(byValueDesc),
      matchesByCategory: Array.from(matchesByCategory.entries())
        .map(([name, value]) => ({ name, value }))
        .sort(byValueDesc),
      topCities: Array.from(cityCounts.entries())
        .map(([city, count]) => ({ city, users: count }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 8),
      platformTimeline,
      trends,
      revenueByPlan,
      planTrends,
      totalMatches: users.reduce((sum, user) => sum + user.matches, 0),
      estimatedMonthlyRevenue:
        Math.round(revenueByPlan.reduce((sum, row) => sum + row.monthlyRevenue, 0) * 100) / 100,
    };
  }

  async changePassword(adminId: string, payload: AdminChangePasswordPayload) {
    if (payload.newPassword.length < 8) {
      throw badRequest('password too short');
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, password: true },
    });

    if (!admin) {
      throw notFound('user not found');
    }

    if (!admin.password) {
      throw forbidden('invalid current password');
    }

    const isCurrentValid = await bcrypt.compare(payload.currentPassword, admin.password);

    if (!isCurrentValid) {
      throw forbidden('invalid current password');
    }

    const hashed = await bcrypt.hash(payload.newPassword, await bcrypt.genSalt(10));
    await this.prisma.user.update({ where: { id: adminId }, data: { password: hashed } });
    await this.tokenService.revokeAllSessions(adminId);

    return { updated: true, forceLogout: true };
  }
}
