import { FastifyPluginAsync } from 'fastify';

import { UserPlan } from '@saas-boilerplate/types';

import {
  adminAnalyticsSchema,
  adminChangePasswordSchema,
  adminDeleteUserSchema,
  adminGetUserSchema,
  adminListPlansSchema,
  adminListUsersSchema,
  adminStatsSchema,
  adminUpdatePlanSchema,
  adminUpdateUserSchema,
  adminUpdateUserStatusSchema,
} from '../../../schemas/v1/index.js';
import { AdminService } from '../../../services/admin.js';
import {
  AdminChangePasswordPayload,
  AdminListUsersQuery,
  AdminUpdatePlanPayload,
  AdminUpdateUserPayload,
  AdminUpdateUserStatusPayload,
} from '../../../types/admin.js';

type UserParams = { id: string };
type PlanParams = { id: UserPlan };

const routes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const { prisma } = fastify;
  const adminService = new AdminService({ prisma });

  fastify.get<{ Querystring: AdminListUsersQuery }>(
    '/users',
    { schema: adminListUsersSchema },
    async (request, reply) => {
      const data = await adminService.listUsers(request.query);
      return reply.code(200).send(data);
    },
  );

  fastify.get<{ Params: UserParams }>(
    '/users/:id',
    { schema: adminGetUserSchema },
    async (request, reply) => {
      const user = await adminService.getUserById(request.params.id);
      return reply.code(200).send({ user });
    },
  );

  fastify.put<{ Params: UserParams; Body: AdminUpdateUserPayload }>(
    '/users/:id',
    { schema: adminUpdateUserSchema },
    async (request, reply) => {
      const user = await adminService.updateUser(request.params.id, request.body);
      return reply.code(200).send({ user });
    },
  );

  fastify.patch<{ Params: UserParams; Body: AdminUpdateUserStatusPayload }>(
    '/users/:id/status',
    { schema: adminUpdateUserStatusSchema },
    async (request, reply) => {
      const user = await adminService.updateUserStatus(request.params.id, request.body.status);
      return reply.code(200).send({ user });
    },
  );

  fastify.delete<{ Params: UserParams }>(
    '/users/:id',
    { schema: adminDeleteUserSchema },
    async (request, reply) => {
      const data = await adminService.deleteUser(request.params.id);
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
      const plan = await adminService.updatePlan(request.params.id, request.body);
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
      return reply.code(200).send(data);
    },
  );
};

export default routes;
