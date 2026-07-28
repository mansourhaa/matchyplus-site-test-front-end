import { FastifyPluginAsync } from 'fastify';

import { postSwipeSchema, swipeFeedQuerySchema } from '../../../schemas/v1/index.js';
import { DiscoveryService } from '../../../services/discovery.js';
import { SwipeService } from '../../../services/swipe.js';
import { PostSwipeBody } from '../../../types/matching.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const discovery = new DiscoveryService({ prisma: fastify.prisma });
  const swipe = new SwipeService({
    prisma: fastify.prisma,
    notify: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  fastify.get<{
    Querystring: { latitude?: number; longitude?: number; limit?: number };
  }>('/swipe-feed', { schema: swipeFeedQuerySchema }, async (request) => {
    return discovery.getSwipeFeed(request.loggedUser.id, request.query);
  });

  fastify.get('/quota', async (request) => {
    return swipe.getQuota(request.loggedUser.id);
  });

  fastify.post<{ Body: PostSwipeBody }>(
    '/swipe',
    { schema: postSwipeSchema },
    async (request, reply) => {
      const result = await swipe.postSwipe(request.loggedUser.id, request.body);
      return reply.code(200).send(result);
    },
  );
};

export default routes;
