import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp } from './build-test-app.js';

/**
 * Defense-in-depth against CSRF now that sessions ride on HttpOnly cookies the browser
 * attaches automatically — SameSite=Lax already blocks most of this, but rejecting a
 * mismatched Origin/Referer on every state-changing route closes the rest of the gap
 * (see plugins/origin-guard.ts). CORS_ORIGINS is fixed to 'http://localhost:3000' for
 * the whole test run (see vitest.config.ts).
 */
describe('origin guard', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('rejects a state-changing request whose Origin is not an allowed frontend', async () => {
    const app = await buildTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      headers: { origin: 'https://attacker.example' },
      payload: { phone: '+21612345678' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('origin_not_allowed');
  });

  it('allows a state-changing request from an allowed frontend origin', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: async () => null } as never,
        otpChallenge: {
          findFirst: async () => null,
          create: async () => ({}),
        } as never,
      },
      smsClient: { sendSms: async () => undefined },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      headers: { origin: 'http://localhost:3000' },
      payload: { phone: '+21612345678' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('falls back to the Referer origin when Origin is absent', async () => {
    const app = await buildTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      headers: { referer: 'https://attacker.example/some/page' },
      payload: { phone: '+21612345678' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('lets a request through when neither Origin nor Referer is present (non-browser client)', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: async () => null } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', password: 'password123' },
    });

    // No Origin/Referer at all — the guard has nothing to check, so this reaches the
    // route handler itself (which rejects it for an unrelated reason: no such user).
    expect(response.statusCode).toBe(401);
  });

  it('never applies to GET requests', async () => {
    const app = await buildTestApp();
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/authcheck',
      headers: { origin: 'https://attacker.example' },
    });

    // Rejected for lacking auth, not for the origin — the guard only looks at
    // state-changing methods.
    expect(response.statusCode).toBe(401);
  });
});
