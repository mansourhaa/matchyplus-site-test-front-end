import { FastifyPluginAsync } from 'fastify';

import { PRO_COUNT_HTTP_MAX_AGE_SECONDS, PRO_COUNT_RATE_LIMIT } from '../../../constants.js';
import { proCountSchema } from '../../../schemas/v1/pros.js';
import { ProsService } from '../../../services/pros.js';
import { ProCountQuery } from '../../../types/pros.js';

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const pros = new ProsService({ prisma: fastify.prisma, redis: fastify.redisClient });

  // Public (the landing site's search page): rate-limited per visitor, counts cached in Redis.
  fastify.get<{ Querystring: ProCountQuery }>(
    '/count',
    {
      schema: proCountSchema,
      config: { rateLimit: PRO_COUNT_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const result = await pros.count(request.query);
        // the same search gives the same number for a few minutes: browsers and CDNs may reuse it
        reply.header('Cache-Control', `public, max-age=${PRO_COUNT_HTTP_MAX_AGE_SECONDS}`);
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
