import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

function signAccessToken(userId: string) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, 'test-access-token-secret');
}

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

  it('deletes a passwordless account once confirmed, without ever returning password data', async () => {
    const deleteMock = vi.fn().mockResolvedValue({ id: 'user-1' });
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            password: null,
            status: 'ACTIVE',
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            password: null,
            status: 'ACTIVE',
          }),
          delete: deleteMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/account',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: { confirm: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: expect.any(String) });
    expect(response.body).not.toContain('password');
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
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            password: null,
            status: 'ACTIVE',
          }),
          delete: deleteMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/account',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
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
            role: 'USER',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/authcheck',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
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
        role: 'USER',
        onboarding_completed: false,
      },
    });
    expect(response.body).not.toContain('password');
  });
});
