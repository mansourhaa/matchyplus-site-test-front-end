import underPressure from '@fastify/under-pressure';
import fp from 'fastify-plugin';

/**
 * Measure process load with automatic handling of "Service Unavailable" plugin for Fastify
 *
 * @see https://github.com/fastify/under-pressure
 */
export default fp(
  async (fastify) => {
    // Not under test. This plugin rejects every request with 503 once the event
    // loop lags past maxEventLoopDelay, which is correct in production and
    // actively harmful in a test suite: the suite then asserts on how busy the
    // CI machine is rather than on the code.
    //
    // It was doing exactly that. src/test/admin-session.test.ts and
    // src/test/auth-rate-limits.test.ts failed with "expected 503 to be 200"
    // and "expected 503 to be 400" on a loaded build agent, then passed
    // unchanged on a quiet one - the same commit produced three different
    // results across builds #19, #20 and main #1/#2. Those two files are simply
    // the slowest of the 34, so they are the first to cross the threshold.
    if (process.env.NODE_ENV === 'test') return;

    fastify.register(underPressure, {
      maxEventLoopDelay: 1000,
      maxHeapUsedBytes: 1000000000,
      maxRssBytes: 1000000000,
      maxEventLoopUtilization: 0.98,
      message: 'server under pressure',
      retryAfter: 50,
      exposeStatusRoute: {
        routeResponseSchemaOpts: {
          extraValue: { type: 'string' },
          metrics: {
            type: 'object',
            properties: {
              eventLoopDelay: { type: 'number' },
              rssBytes: { type: 'number' },
              heapUsed: { type: 'number' },
              eventLoopUtilized: { type: 'number' },
            },
          },
        },
        routeSchemaOpts: {
          hide: true,
        },
        routeOpts: {
          logLevel: 'debug',
          config: {
            someAttr: 'value',
          },
        },
        url: '/alive',
      },

      healthCheck: async (fastifyInstance: { memoryUsage: () => object }) => {
        return {
          metrics: fastifyInstance.memoryUsage(),
        };
      },
    });
  },
  {
    name: 'under-pressure',
  },
);
