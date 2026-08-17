import ratelimit, { FastifyRateLimitOptions } from '@fastify/rate-limit';
import fp from 'fastify-plugin';

import { config } from '../config.js';

/**
 * A low overhead rate limiter for your routes.
 * Uses Redis when available so limits are shared across API replicas.
 *
 * @see https://github.com/fastify/fastify-rate-limit
 */
export default fp<FastifyRateLimitOptions>(
  async (fastify) => {
    await fastify.register(ratelimit, {
      max: config.rateLimitGlobalMax,
      timeWindow: config.rateLimitGlobalWindow,
      ...(fastify.redisClient ? { redis: fastify.redisClient } : {}),
    });
  },
  {
    name: 'rate-limiter',
    dependencies: ['redis'],
  },
);
