import ratelimit, { FastifyRateLimitOptions } from '@fastify/rate-limit';
import { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';
import { expectedAccessAudience } from './authorization.js';

/**
 * A low overhead rate limiter for your routes.
 * Uses Redis when available so limits are shared across API replicas.
 * Admin endpoints (/api/v1/admin/*) are exempted from the global rate limiter so dashboard
 * views with high object/asset counts are not throttled.
 *
 * @see https://github.com/fastify/fastify-rate-limit
 */
export default fp<FastifyRateLimitOptions>(
  async (fastify) => {
    await fastify.register(ratelimit, {
      max: config.rateLimitGlobalMax,
      timeWindow: config.rateLimitGlobalWindow,
      allowList: (req: FastifyRequest) => {
        return expectedAccessAudience(req) === 'admin';
      },
      ...(fastify.redisClient ? { redis: fastify.redisClient } : {}),
    });
  },
  {
    name: 'rate-limiter',
    dependencies: ['redis'],
  },
);
