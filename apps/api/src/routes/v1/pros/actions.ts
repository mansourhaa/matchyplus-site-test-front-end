import { FastifyPluginAsync } from 'fastify';

import { proCountSchema } from '../../../schemas/v1/pros.js';
import { ProsService } from '../../../services/pros.js';
import { ProCountQuery } from '../../../types/pros.js';

/** Public (the landing site's search page): limited per visitor, like the contact form. */
const PRO_COUNT_RATE_LIMIT = { max: 60, timeWindow: '1 minute' };

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const pros = new ProsService({ prisma: fastify.prisma });

  fastify.get<{ Querystring: ProCountQuery }>(
    '/count',
    {
      schema: proCountSchema,
      config: { rateLimit: PRO_COUNT_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const result = await pros.count(request.query);
        // the same search gives the same number for a few minutes: let browsers and CDNs reuse it
        reply.header('Cache-Control', 'public, max-age=300');
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
