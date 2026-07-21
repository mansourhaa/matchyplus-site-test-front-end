import cors, { FastifyCorsOptions } from '@fastify/cors';
import fp from 'fastify-plugin';

/**
 * enables the use of CORS in a Fastify application.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp<FastifyCorsOptions>(
  async (fastify) => {
    // Without an explicit `origin`, @fastify/cors reflects whatever Origin the caller sends.
    // CORS_ORIGINS pins that down to the deployed frontends; left unset (local development)
    // the permissive reflection is kept so nothing changes on a developer machine.
    const allowedOrigins = (process.env['CORS_ORIGINS'] ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    fastify.register(cors, {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      // Defaults to GET,HEAD,POST only, which fails preflight for every write route.
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  },
  {
    name: 'cors',
  },
);
