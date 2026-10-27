import { FastifyPluginAsync } from 'fastify';

import {
  discoveryQuotaSchema,
  discoverySectorsSchema,
  postSwipeSchema,
  swipeFeedQuerySchema,
} from '../../../schemas/v1/matching.js';
import { DiscoveryService } from '../../../services/discovery.js';
import { SwipeService } from '../../../services/swipe.js';
import { DiscoveryFeedQuery, PostSwipeBody } from '../../../types/matching.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const discovery = new DiscoveryService({ prisma: fastify.prisma });
  const swipe = new SwipeService({
    prisma: fastify.prisma,
    notify: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  fastify.get<{ Querystring: DiscoveryFeedQuery }>(
    '/swipe-feed',
    { schema: swipeFeedQuerySchema },
    async (request, reply) => {
      try {
        const data = await discovery.getSwipeFeed(request.loggedUser.id, request.query);
        return reply.code(200).send(data);
      } catch (err) {
        throw err;
      }
    },
  );

  fastify.get('/sectors', { schema: discoverySectorsSchema }, async (request, reply) => {
    try {
      const data = await discovery.getSectors();
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.get('/quota', { schema: discoveryQuotaSchema }, async (request, reply) => {
    try {
      const data = await swipe.getQuota(request.loggedUser.id);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  });

  fastify.post<{ Body: PostSwipeBody }>(
    '/swipe',
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
};

export default routes;
