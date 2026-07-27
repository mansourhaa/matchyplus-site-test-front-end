import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../lib/password.js';
import { buildTestApp } from './build-test-app.js';

/**
 * Route-level coverage for the three distinct login-phone failure codes (see
 * services/phone-authentication.ts) — confirms actions.ts's ERROR_STATUS map turns each
 * into the right HTTP status and a stable `code` in the response body, not just that the
 * service throws the right message.
 */
describe('POST /api/v1/auth/login-phone — error mapping', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('maps an unknown phone to 401 invalid_credentials', async () => {
    const app = await buildTestApp({
      prisma: { user: { findUnique: vi.fn().mockResolvedValue(null) } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', password: 'password123' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('invalid_credentials');
  });

  it('maps a wrong password to 401 invalid_credentials', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            phone: '+21612345678',
            password: await hashPassword('password123'),
            phone_verified: true,
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('invalid_credentials');
  });

  it('maps a social-only account to 403 oauth_only_account', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            phone: '+21612345678',
            password: null,
            phone_verified: true,
            auth_provider: 'google',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', password: 'password123' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('oauth_only_account');
  });

  it('maps valid credentials with an unverified phone to 403 phone_not_verified', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            phone: '+21612345678',
            password: await hashPassword('password123'),
            phone_verified: false,
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', password: 'password123' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('phone_not_verified');
  });
});
