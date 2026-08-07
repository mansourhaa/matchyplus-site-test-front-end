import { FastifyPluginAsync } from 'fastify';

import { UserPlan } from '@saas-boilerplate/types';

import {
  adminAnalyticsSchema,
  adminChangePasswordSchema,
  adminDeleteUserSchema,
  adminGetUserSchema,
  adminListPlansSchema,
  adminListReportsSchema,
  adminListUsersSchema,
  adminReportSummarySchema,
  adminStatsSchema,
  adminUpdatePlanSchema,
  adminUpdateReportSchema,
  adminUpdateUserSchema,
  adminUpdateUserStatusSchema,
} from '../../../schemas/v1/index.js';
import { AdminService } from '../../../services/admin.js';
import { ReportsService } from '../../../services/reports.js';
import {
  AdminChangePasswordPayload,
  AdminListUsersQuery,
  AdminUpdatePlanPayload,
  AdminUpdateUserPayload,
  AdminUpdateUserStatusPayload,
} from '../../../types/admin.js';
import { AdminListReportsQuery, AdminUpdateReportPayload } from '../../../types/report.js';
import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookieOptions,
} from '../../../utils/admin-session.js';

type UserParams = { id: string };
type PlanParams = { id: UserPlan };

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma } = fastify;
  const adminService = new AdminService({ prisma });
  const reportsService = new ReportsService({ prisma });

  fastify.get<{ Querystring: AdminListUsersQuery }>(
    '/users',
    { schema: adminListUsersSchema },
    async (request, reply) => {
      const data = await adminService.listUsers(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.query,
      );
      return reply.code(200).send(data);
    },
  );

  fastify.get<{ Params: UserParams }>(
    '/users/:id',
    { schema: adminGetUserSchema },
    async (request, reply) => {
      const user = await adminService.getUserById(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
      );
      return reply.code(200).send({ user });
    },
  );

  fastify.put<{ Params: UserParams; Body: AdminUpdateUserPayload }>(
    '/users/:id',
    { schema: adminUpdateUserSchema },
    async (request, reply) => {
      const user = await adminService.updateUser(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
        request.body,
      );
      return reply.code(200).send({ user });
    },
  );

  fastify.patch<{ Params: UserParams; Body: AdminUpdateUserStatusPayload }>(
    '/users/:id/status',
    { schema: adminUpdateUserStatusSchema },
    async (request, reply) => {
      const user = await adminService.updateUserStatus(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
        request.body.status,
      );
      return reply.code(200).send({ user });
    },
  );

  fastify.delete<{ Params: UserParams }>(
    '/users/:id',
    { schema: adminDeleteUserSchema },
    async (request, reply) => {
      const data = await adminService.deleteUser(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
      );
      return reply.code(200).send(data);
    },
  );

  fastify.get('/stats', { schema: adminStatsSchema }, async (request, reply) => {
    const stats = await adminService.getStats();
    return reply.code(200).send({ stats });
  });

  fastify.get('/plans', { schema: adminListPlansSchema }, async (request, reply) => {
    const plans = await adminService.listPlans();
    return reply.code(200).send({ plans });
  });

  fastify.put<{ Params: PlanParams; Body: AdminUpdatePlanPayload }>(
    '/plans/:id',
    { schema: adminUpdatePlanSchema },
    async (request, reply) => {
      const plan = await adminService.updatePlan(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
        request.body,
      );
      return reply.code(200).send({ plan });
    },
  );

  fastify.get('/analytics', { schema: adminAnalyticsSchema }, async (request, reply) => {
    const analytics = await adminService.getAnalytics();
    return reply.code(200).send({ analytics });
  });

  fastify.post<{ Body: AdminChangePasswordPayload }>(
    '/change-password',
    { schema: adminChangePasswordSchema },
    async (request, reply) => {
      const data = await adminService.changePassword(request.loggedUser.id, request.body);
      reply.clearCookie(ADMIN_SESSION_COOKIE, clearAdminSessionCookieOptions());
      return reply.code(200).send(data);
    },
  );

  fastify.get<{ Querystring: AdminListReportsQuery }>(
    '/reports',
    { schema: adminListReportsSchema },
    async (request, reply) => {
      const reports = await reportsService.listReports(request.query);
      return reply.code(200).send({ reports });
    },
  );

  fastify.get('/reports/summary', { schema: adminReportSummarySchema }, async (request, reply) => {
    const summary = await reportsService.getReportSummary();
    return reply.code(200).send({ summary });
  });

  fastify.patch<{ Params: UserParams; Body: AdminUpdateReportPayload }>(
    '/reports/:id',
    { schema: adminUpdateReportSchema },
    async (request, reply) => {
      const report = await reportsService.updateReportStatus(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
        request.body,
      );
      return reply.code(200).send({ report });
    },
  );
};

export default routes;
