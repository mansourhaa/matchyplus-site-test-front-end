import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashVerificationCode } from '../lib/verification-code.js';
import { buildTestApp } from './build-test-app.js';

/**
 * Route-level coverage for login-phone failure codes (see
 * services/phone-authentication.ts) — confirms actions.ts's ERROR_STATUS map turns each
 * into the right HTTP status and a stable `code` in the response body.
 */
describe('POST /api/v1/auth/login-phone — error mapping', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('maps an invalid or missing OTP challenge to 400 invalid_otp', async () => {
    const app = await buildTestApp({
      prisma: {
        otpChallenge: { findFirst: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', code: '123456' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('invalid_otp');
  });

  it('maps an unknown phone after OTP check to 404 phone_not_found', async () => {
    const app = await buildTestApp({
      prisma: {
        otpChallenge: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'chal-1',
            phone: '+21612345678',
            purpose: 'PHONE_LOGIN',
            code_hash: hashVerificationCode('123456'),
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        } as never,
        user: { findUnique: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', code: '123456' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('phone_not_found');
  });

  it('maps a banned account to 403 account_banned', async () => {
    const app = await buildTestApp({
      prisma: {
        otpChallenge: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'chal-1',
            phone: '+21612345678',
            purpose: 'PHONE_LOGIN',
            code_hash: hashVerificationCode('123456'),
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        } as never,
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            phone: '+21612345678',
            password: null,
            phone_verified: true,
            status: 'BANNED',
            token_version: 0,
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', code: '123456' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('account_banned');
  });

  it('maps a deactivated account (without pending activation) to 403 account_inactive', async () => {
    const app = await buildTestApp({
      prisma: {
        otpChallenge: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'chal-1',
            phone: '+21612345678',
            purpose: 'PHONE_LOGIN',
            code_hash: hashVerificationCode('123456'),
            attempts: 0,
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: null,
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        } as never,
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            phone: '+21612345678',
            password: null,
            phone_verified: true,
            must_change_password: false,
            status: 'INACTIVE',
            token_version: 0,
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', code: '123456' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('account_inactive');
  });
});
