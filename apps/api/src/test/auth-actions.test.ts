import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../lib/password.js';
import { buildTestApp } from './build-test-app.js';
import { signTestAccessToken } from './sign-test-access-token.js';

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
      prisma: {
        otpChallenge: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        } as never,
      },
      smsClient: {
        sendSms: vi.fn().mockResolvedValue(undefined),
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

describe('DELETE /api/v1/auth/account', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/account',
      payload: { confirm: true },
    });

    expect(response.statusCode).toBe(401);
  });

  it('deletes a passwordless account with OTP step-up, without ever returning password data', async () => {
    const deleteMock = vi.fn().mockResolvedValue({ id: 'user-1' });
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            phone: '+21612345678',
            password: null,
            status: 'ACTIVE',
            token_version: 0,
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            phone: '+21612345678',
            password: null,
            status: 'ACTIVE',
            token_version: 0,
          }),
          delete: deleteMock,
        } as never,
        otpChallenge: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'otp-1',
            phone: '+21612345678',
            purpose: 'ACCOUNT_DELETE',
            code_hash: 'irrelevant',
            expires_at: new Date(Date.now() + 60_000),
            attempts: 0,
            consumed_at: null,
            user_id: 'user-1',
          }),
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/account',
      headers: { authorization: `Bearer ${signTestAccessToken('user-1')}` },
      payload: { confirm: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: expect.any(String) });
    expect(response.body).not.toMatch(/"password"\s*:/);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('rejects deletion when confirmation is missing', async () => {
    const deleteMock = vi.fn();
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            password: null,
            status: 'ACTIVE',
            token_version: 0,
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            password: null,
            status: 'ACTIVE',
            token_version: 0,
          }),
          delete: deleteMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/account',
      headers: { authorization: `Bearer ${signTestAccessToken('user-1')}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe('member-session routes — onboarding_completed on the wire', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  // These exercise the real Fastify response schema serialization (fast-json-stringify),
  // not just the service-layer JS object — a field missing from the schema is silently
  // dropped from the wire even if the service returns it, which is exactly how this bug
  // shipped originally: onboarding_completed existed in code but wasn't in the schema.

  it('POST /login-phone returns onboarding_completed as a boolean, never the password', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: null,
            phone: '+33612345678',
            name: 'Jane Doe',
            password: await hashPassword('password123'),
            auth_provider: 'phone',
            email_verified: false,
            phone_verified: true,
            status: 'ACTIVE',
            onboarding_completed_at: null,
          }),
        } as never,
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+33612345678', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: 'user-1',
        email: null,
        phone: '+33612345678',
        name: 'Jane Doe',
        auth_provider: 'phone',
        email_verified: false,
        phone_verified: true,
        google_linked: false,
        linkedin_linked: false,
        has_password: true,
        onboarding_completed: false,
      },
    });
    expect(response.body).not.toMatch(/"password"\s*:/);
  });

  it('POST /register-phone returns onboarding_completed: false for a brand-new account', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: null,
            phone: '+33612345678',
            name: '+33612345678',
            auth_provider: 'phone',
            email_verified: false,
            phone_verified: true,
            status: 'ACTIVE',
            onboarding_completed_at: null,
          }),
        } as never,
        otpChallenge: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        } as never,
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register-phone',
      payload: {
        phone: '+33612345678',
        password: 'Password123!',
        signupToken: 'a-valid-signup-grant-token',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      user: {
        id: 'user-1',
        email: null,
        phone: '+33612345678',
        name: '+33612345678',
        auth_provider: 'phone',
        email_verified: false,
        phone_verified: true,
        google_linked: false,
        linkedin_linked: false,
        has_password: false,
        onboarding_completed: false,
      },
    });
    expect(response.body).not.toMatch(/"password"\s*:/);
  });

  it('POST /oauth/exchange returns onboarding_completed: true once onboarding is done', async () => {
    const app = await buildTestApp({
      prisma: {
        oAuthExchangeCode: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'exchange-1',
            user_id: 'user-1',
            consumed_at: null,
            expires_at: new Date(Date.now() + 60_000),
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        } as never,
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'jane@example.com',
            phone: null,
            name: 'Jane Doe',
            auth_provider: 'google',
            email_verified: true,
            phone_verified: false,
            google_id: 'google-sub-1',
            linkedin_id: null,
            status: 'ACTIVE',
            onboarding_completed_at: new Date('2026-01-01'),
          }),
        } as never,
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/oauth/exchange',
      payload: { code: 'a-valid-exchange-code-value' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: 'user-1',
        email: 'jane@example.com',
        phone: null,
        name: 'Jane Doe',
        auth_provider: 'google',
        email_verified: true,
        phone_verified: false,
        google_linked: true,
        linkedin_linked: false,
        has_password: false,
        onboarding_completed: true,
      },
    });
  });
});

describe('GET /api/v1/auth/authcheck', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/authcheck',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns the safe profile fields, never password or internal fields', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            phone: '+21612345678',
            name: 'Jane Doe',
            auth_provider: 'email',
            email_verified: true,
            phone_verified: true,
            google_id: null,
            linkedin_id: null,
            role: 'USER',
            status: 'ACTIVE',
            token_version: 0,
            onboarding_completed_at: null,
            password: null,
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/authcheck',
      headers: { authorization: `Bearer ${signTestAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: '+21612345678',
        name: 'Jane Doe',
        auth_provider: 'email',
        email_verified: true,
        phone_verified: true,
        google_linked: false,
        linkedin_linked: false,
        has_password: false,
        role: 'USER',
        onboarding_completed: false,
      },
    });
    expect(response.body).not.toMatch(/"password"\s*:/);
  });
});
