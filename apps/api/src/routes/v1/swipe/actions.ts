import { FastifyPluginAsync } from 'fastify';

import {
  listMatchesSchema,
  listPendingSchema,
  postSwipeSchema,
  swipeStatsSchema,
  unmatchSchema,
  whoLikedMeSchema,
  withdrawPendingSchema,
} from '../../../schemas/v1/matching.js';
import { SwipeService } from '../../../services/swipe.js';
import { PostSwipeBody, TargetUserParams } from '../../../types/matching.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const swipe = new SwipeService({
    prisma: fastify.prisma,
    notify: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  fastify.post<{ Body: PostSwipeBody }>(
    '/',
    { schema: postSwipeSchema },
    async (request, reply) => {
      try {
        const result = await swipe.postSwipe(request.loggedUser.id, request.body);
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get('/matches', { schema: listMatchesSchema }, async (request, reply) => {
    try {
      const data = await swipe.listMatches(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.get('/pending', { schema: listPendingSchema }, async (request, reply) => {
    try {
      const data = await swipe.listPending(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.delete<{ Params: TargetUserParams }>(
    '/pending/:userId',
    { schema: withdrawPendingSchema },
    async (request, reply) => {
      try {
        const result = await swipe.withdrawPending(request.loggedUser.id, request.params.userId);
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get('/stats', { schema: swipeStatsSchema }, async (request, reply) => {
    try {
      const data = await swipe.getStats(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.get('/who-liked-me', { schema: whoLikedMeSchema }, async (request, reply) => {
    try {
      const data = await swipe.getWhoLikedMe(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.post<{ Params: TargetUserParams }>(
    '/unmatch/:userId',
    { schema: unmatchSchema },
    async (request, reply) => {
      try {
        const result = await swipe.unmatch(request.loggedUser.id, request.params.userId);
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
