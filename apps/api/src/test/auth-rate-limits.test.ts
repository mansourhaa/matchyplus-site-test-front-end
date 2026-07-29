import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

// Focused regression coverage for the previously-missing rate limits (see
// doc/features/authentication.md) — one representative credential-guessing
// route and one code-verification route, not an exhaustive sweep of every auth endpoint.
describe('auth route rate limits', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('caps /login-phone at 10 requests per window', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const payload = { phone: '+21612345678', password: 'password123' };
    for (let i = 0; i < 10; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login-phone',
        payload,
      });
      expect(response.statusCode).toBe(401);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload,
    });
    expect(limited.statusCode).toBe(429);
  });

  it('caps /otp/verify at 10 requests per window', async () => {
    const app = await buildTestApp({
      prisma: {
        otpChallenge: { findFirst: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const payload = { phone: '+21612345678', code: '123456' };
    for (let i = 0; i < 10; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload,
      });
      expect(response.statusCode).toBe(400);
    }

    const limited = await app.inject({ method: 'POST', url: '/api/v1/auth/otp/verify', payload });
    expect(limited.statusCode).toBe(429);
  });
});
