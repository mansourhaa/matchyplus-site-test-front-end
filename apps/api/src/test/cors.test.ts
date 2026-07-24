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

  it('does not grant access to an origin outside the allowlist', async () => {
    const app = await buildTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/admin/users/some-id',
      headers: {
        origin: 'https://attacker.example',
        'access-control-request-method': 'DELETE',
      },
    });

    // No allow-origin header means the browser blocks the response, whatever the status.
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

/**
 * An unset CORS_ORIGINS used to leave `origin: true`, i.e. @fastify/cors reflecting whatever
 * Origin the caller sent — any site could then drive the admin API from a logged-in browser.
 * Outside development that is a misconfiguration the app must not start with.
 */
describe('CORS configuration outside development', () => {
  const originalOrigins = process.env['CORS_ORIGINS'];
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    process.env['CORS_ORIGINS'] = originalOrigins;
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  it.each(['staging', 'production', 'test', undefined])(
    'refuses to start with an empty allowlist when NODE_ENV is %s',
    async (nodeEnv) => {
      delete process.env['CORS_ORIGINS'];
      if (nodeEnv === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = nodeEnv;
      }

      await expect(buildTestApp()).rejects.toThrow(/CORS_ORIGINS/);
    },
  );

  it('still starts with a permissive allowlist in development', async () => {
    delete process.env['CORS_ORIGINS'];
    process.env['NODE_ENV'] = 'development';

    const app = await buildTestApp();
    await app.close();
  });
});
