import cors, { FastifyCorsOptions } from '@fastify/cors';
import fp from 'fastify-plugin';

/**
 * enables the use of CORS in a Fastify application.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp<FastifyCorsOptions>(
  async (fastify) => {
    fastify.register(cors, {
      // Defaults to GET,HEAD,POST only, which fails preflight for every write route.
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  },
  {
    name: 'cors',
  },
);
