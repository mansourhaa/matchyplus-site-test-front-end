import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp } from './build-test-app.js';

/**
 * The admin panel writes with PUT/PATCH/DELETE from another origin. @fastify/cors only allows
 * GET/HEAD/POST by default, which silently fails those calls at preflight in a browser — a
 * failure no same-process request (app.inject without an Origin) or mocked client can reveal.
 */
describe('CORS preflight', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it.each(['PUT', 'PATCH', 'DELETE', 'POST', 'GET'])(
    'allows %s from a browser origin',
    async (method) => {
      const app = await buildTestApp();
      apps.push(app);

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/admin/users/some-id',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': method,
          'access-control-request-headers': 'authorization,content-type',
        },
      });

      expect(response.statusCode).toBeLessThan(300);
      expect(response.headers['access-control-allow-methods']).toContain(method);
    },
  );
});
