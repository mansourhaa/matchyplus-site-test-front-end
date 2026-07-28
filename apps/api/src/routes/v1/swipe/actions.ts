import { FastifyPluginAsync } from 'fastify';

import { postSwipeSchema, targetUserParamsSchema } from '../../../schemas/v1/matching.js';
import { SwipeService } from '../../../services/swipe.js';
import { PostSwipeBody } from '../../../types/matching.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const swipe = new SwipeService({
    prisma: fastify.prisma,
    notify: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  fastify.post<{ Body: PostSwipeBody }>(
    '/',
    { schema: postSwipeSchema },
    async (request, reply) => {
      const result = await swipe.postSwipe(request.loggedUser.id, request.body);
      return reply.code(200).send(result);
    },
  );

  fastify.get('/matches', async (request) => {
    return swipe.listMatches(request.loggedUser.id);
  });

  fastify.get('/pending', async (request) => {
    return swipe.listPending(request.loggedUser.id);
  });

  fastify.delete<{ Params: { userId: string } }>(
    '/pending/:userId',
    { schema: targetUserParamsSchema },
    async (request, reply) => {
      const result = await swipe.withdrawPending(request.loggedUser.id, request.params.userId);
      return reply.code(200).send(result);
    },
  );

  fastify.get('/stats', async (request) => {
    return swipe.getStats(request.loggedUser.id);
  });

  fastify.get('/who-liked-me', async (request) => {
    return swipe.getWhoLikedMe(request.loggedUser.id);
  });

  fastify.post<{ Params: { userId: string } }>(
    '/unmatch/:userId',
    { schema: targetUserParamsSchema },
    async (request, reply) => {
      const result = await swipe.unmatch(request.loggedUser.id, request.params.userId);
      return reply.code(200).send(result);
    },
  );
};

export default routes;
