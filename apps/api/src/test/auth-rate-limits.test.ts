import { afterEach, describe, expect, it, vi } from 'vitest';

import { config } from '../config.js';
import { buildTestApp } from './build-test-app.js';

describe('auth route rate limits', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('applies global rate limit on auth routes when limit is reached', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const payload = { phone: '+21612345678', password: 'password123' };
    for (let i = 0; i < config.rateLimitGlobalMax; i++) {
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
});
