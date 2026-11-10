import { FastifyPluginAsync } from 'fastify';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';

import { UserPlan } from '@saas-boilerplate/types';

import { PROFILE_PHOTO_CONTENT_TYPES, PROFILE_VIDEO_CONTENT_TYPES } from '../../../constants.js';
import {
  adminAnalyticsSchema,
  adminChangePasswordSchema,
  adminCreateTeamMemberSchema,
  adminCreateUserSchema,
  adminDeleteUserSchema,
  adminGetUserPhotoSchema,
  adminGetUserSchema,
  adminGetUserVideoSchema,
  adminListPlansSchema,
  adminListReportsSchema,
  adminListTeamSchema,
  adminListUsersSchema,
  adminRegenerateActivationSchema,
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
  AdminCreateTeamMemberPayload,
  AdminCreateUserPayload,
  AdminListTeamQuery,
  AdminListUsersQuery,
  AdminUpdatePlanPayload,
  AdminUpdateUserPayload,
  AdminUpdateUserStatusPayload,
  AdminUserIdParam,
} from '../../../types/admin.js';
import { AdminListReportsQuery, AdminUpdateReportPayload } from '../../../types/report.js';
import {
  ADMIN_REFRESH_COOKIE,
  ADMIN_SESSION_COOKIE,
  clearAdminRefreshCookieOptions,
  clearAdminSessionCookieOptions,
} from '../../../utils/admin-session.js';
import { badRequest, notFound } from '../../../utils/http-errors.js';
import { extensionOf } from '../../../utils/media-http.js';
import { PHOTOS_DIR, VIDEOS_DIR } from '../../../utils/media-storage.js';

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

  fastify.post<{ Body: AdminCreateUserPayload }>(
    '/users',
    { schema: adminCreateUserSchema, bodyLimit: 15 * 1024 * 1024 },
    async (request, reply) => {
      try {
        const user = await adminService.createUser(request.body);
        return reply.code(200).send({
          user,
          activationToken: user.activationToken,
          activationLink: user.activationLink,
        });
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.post<{ Params: AdminUserIdParam }>(
    '/users/:id/regenerate-activation',
    { schema: adminRegenerateActivationSchema },
    async (request, reply) => {
      try {
        const result = await adminService.regenerateActivationToken(
          { id: request.loggedUser.id, role: request.loggedUser.role },
          request.params.id,
        );
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get<{ Querystring: AdminListTeamQuery }>(
    '/team',
    { schema: adminListTeamSchema },
    async (request, reply) => {
      const data = await adminService.listTeamMembers(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.query,
      );
      return reply.code(200).send(data);
    },
  );

  fastify.post<{ Body: AdminCreateTeamMemberPayload }>(
    '/team',
    { schema: adminCreateTeamMemberSchema },
    async (request, reply) => {
      const member = await adminService.createTeamMember(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.body,
      );
      return reply.code(200).send({ member });
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

  fastify.get<{ Params: UserParams }>(
    '/users/:id/photo',
    { schema: adminGetUserPhotoSchema },
    async (request, reply) => {
      const filename = await adminService.getUserPhotoFilename(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
      );
      const contentType = PROFILE_PHOTO_CONTENT_TYPES[extensionOf(filename)];
      if (!contentType) throw badRequest('invalid filename', 'invalid_filename');

      const filePath = join(PHOTOS_DIR, filename);
      if (!existsSync(filePath)) throw notFound('photo not found', 'photo_not_found');

      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'private, max-age=86400');
      return reply.send(createReadStream(filePath));
    },
  );

  fastify.get<{ Params: UserParams }>(
    '/users/:id/video',
    { schema: adminGetUserVideoSchema },
    async (request, reply) => {
      const filename = await adminService.getUserVideoFilename(
        { id: request.loggedUser.id, role: request.loggedUser.role },
        request.params.id,
      );
      const contentType = PROFILE_VIDEO_CONTENT_TYPES[extensionOf(filename)];
      if (!contentType) throw badRequest('invalid filename', 'invalid_filename');

      const filePath = join(VIDEOS_DIR, filename);
      if (!existsSync(filePath)) throw notFound('video not found', 'video_not_found');

      reply.header('Content-Type', contentType);
      reply.header('Cache-Control', 'private, max-age=86400');
      return reply.send(createReadStream(filePath));
    },
  );

  fastify.put<{ Params: UserParams; Body: AdminUpdateUserPayload }>(
    '/users/:id',
    { schema: adminUpdateUserSchema, bodyLimit: 15 * 1024 * 1024 },
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
      // The refresh token behind this cookie was already revoked server-side by
      // changePassword's revokeAllSessions call — clear the cookie too so the browser
      // doesn't keep offering a token that would just fail on the next refresh attempt.
      reply.clearCookie(ADMIN_SESSION_COOKIE, clearAdminSessionCookieOptions());
      reply.clearCookie(ADMIN_REFRESH_COOKIE, clearAdminRefreshCookieOptions());
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
