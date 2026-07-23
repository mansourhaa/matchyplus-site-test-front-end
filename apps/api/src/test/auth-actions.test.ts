import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

describe('POST /api/v1/auth — error/message translation', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('translates a mapped error while preserving its code for programmatic handling', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+33612345678', password: 'password123' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      code: 'invalid_credentials',
      message: 'Invalid phone number or password.',
    });
  });

  it('translates a success message instead of returning the raw internal code', async () => {
    const app = await buildTestApp({
      otpClient: {
        sendOtp: vi.fn().mockResolvedValue({ status: 'pending', sid: 'test-sid' }),
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { phone: '+33612345678' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: 'Verification code sent.',
    });
  });

  it('does not expose unknown internal error messages', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockRejectedValue(new Error('database_connection_details')),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: {
        phone: '+33612345678',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      code: 'internal_error',
      message: 'An unexpected error occurred',
    });

    expect(response.body).not.toContain('database_connection_details');
  });
});
