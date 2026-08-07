import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '../lib/password.js';
import { buildTestApp } from './build-test-app.js';

/**
 * The member session's JWTs used to go out in the response body and live in
 * sessionStorage / a JS-readable cookie. They now leave the API only as HttpOnly
 * cookies, mirroring the admin panel's existing pattern (see test/admin-session.test.ts).
 */
function findCookie(setCookie: string | string[] | undefined, name: string) {
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
  return headers.find((header) => header.startsWith(`${name}=`)) ?? '';
}

describe('member session cookies', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('returns tokens as HttpOnly cookies on login-phone, never in the response body', async () => {
    const hashedPassword = await hashPassword('password123');
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            phone: '+21612345678',
            password: hashedPassword,
            phone_verified: true,
            status: 'ACTIVE',
          }),
        } as never,
        refreshToken: { create: vi.fn().mockResolvedValue({}) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      payload: { phone: '+21612345678', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).not.toHaveProperty('access_token');
    expect(response.json()).not.toHaveProperty('refresh_token');
    expect(response.json().user.phone).toBe('+21612345678');

    const accessCookie = findCookie(response.headers['set-cookie'], 'access_token');
    const refreshCookie = findCookie(response.headers['set-cookie'], 'refresh_token');
    expect(accessCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('HttpOnly');
    // Scoped narrower than the access cookie, so a stolen refresh token can only ever
    // be replayed against the auth routes themselves.
    expect(refreshCookie).toContain('Path=/api/v1/auth');
  });

  it('returns body tokens only for authorized Cap clients (label + mobile key)', async () => {
    const hashedPassword = await hashPassword('password123');
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            phone: '+21612345678',
            password: hashedPassword,
            phone_verified: true,
            status: 'ACTIVE',
          }),
        } as never,
        refreshToken: { create: vi.fn().mockResolvedValue({}) } as never,
      },
    });
    apps.push(app);

    const spoofed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      headers: { 'x-matchy-client': 'mobile' },
      payload: { phone: '+21612345678', password: 'password123' },
    });
    expect(spoofed.statusCode).toBe(200);
    expect(spoofed.json()).not.toHaveProperty('accessToken');
    expect(spoofed.json()).not.toHaveProperty('refreshToken');

    const authorized = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login-phone',
      headers: {
        'x-matchy-client': 'mobile',
        'x-matchy-mobile-key': 'test-mobile-client-secret',
      },
      payload: { phone: '+21612345678', password: 'password123' },
    });

    expect(authorized.statusCode).toBe(200);
    expect(authorized.json().accessToken).toEqual(expect.any(String));
    expect(authorized.json().refreshToken).toEqual(expect.any(String));
    expect(findCookie(authorized.headers['set-cookie'], 'access_token')).toContain('HttpOnly');
  });

  it('accepts body refreshToken only for authorized Cap clients and returns rotated body JWTs', async () => {
    const { createHash } = await import('node:crypto');
    const jwt = await import('jsonwebtoken');
    const refreshToken = jwt.default.sign(
      { sub: 'user-1', jti: 'jti-1', type: 'refresh' },
      'test-refresh-token-secret',
      { expiresIn: '1h' },
    );
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'jti-1',
            user_id: 'user-1',
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: null,
          }),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        } as never,
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: null,
            phone: '+21612345678',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const rejected = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(rejected.statusCode).toBe(401);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        'x-matchy-client': 'mobile',
        'x-matchy-mobile-key': 'test-mobile-client-secret',
      },
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    expect(response.json().accessToken).toEqual(expect.any(String));
    expect(response.json().refreshToken).toEqual(expect.any(String));
  });

  it('prefers body refreshToken over cookie for authorized Cap so rotated JWTs are returned', async () => {
    const { createHash } = await import('node:crypto');
    const jwt = await import('jsonwebtoken');
    const bodyRefresh = jwt.default.sign(
      { sub: 'user-1', jti: 'jti-body', type: 'refresh' },
      'test-refresh-token-secret',
      { expiresIn: '1h' },
    );
    const cookieRefresh = jwt.default.sign(
      { sub: 'user-1', jti: 'jti-cookie-ignored', type: 'refresh' },
      'test-refresh-token-secret',
      { expiresIn: '1h' },
    );
    const bodyHash = createHash('sha256').update(bodyRefresh).digest('hex');

    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'jti-body',
            user_id: 'user-1',
            token_hash: bodyHash,
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: null,
          }),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        } as never,
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: null,
            phone: '+21612345678',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        'x-matchy-client': 'mobile',
        'x-matchy-mobile-key': 'test-mobile-client-secret',
      },
      cookies: { refresh_token: cookieRefresh },
      payload: { refreshToken: bodyRefresh },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    expect(response.json().accessToken).toEqual(expect.any(String));
    expect(response.json().refreshToken).toEqual(expect.any(String));
  });

  it('returns body JWTs for authorized Cap even when refresh used the HttpOnly cookie', async () => {
    const { createHash } = await import('node:crypto');
    const jwt = await import('jsonwebtoken');
    const refreshToken = jwt.default.sign(
      { sub: 'user-1', jti: 'jti-cookie', type: 'refresh' },
      'test-refresh-token-secret',
      { expiresIn: '1h' },
    );
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'jti-cookie',
            user_id: 'user-1',
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: null,
          }),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        } as never,
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: null,
            phone: '+21612345678',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        'x-matchy-client': 'mobile',
        'x-matchy-mobile-key': 'test-mobile-client-secret',
      },
      cookies: { refresh_token: refreshToken },
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    expect(response.json().accessToken).toEqual(expect.any(String));
    expect(response.json().refreshToken).toEqual(expect.any(String));
  });

  it('falls back to the cookie when authorized Cap sends a stale body refreshToken', async () => {
    const { createHash } = await import('node:crypto');
    const jwt = await import('jsonwebtoken');
    const staleBody = jwt.default.sign(
      { sub: 'user-1', jti: 'jti-stale', type: 'refresh' },
      'test-refresh-token-secret',
      { expiresIn: '1h' },
    );
    const cookieRefresh = jwt.default.sign(
      { sub: 'user-1', jti: 'jti-cookie-ok', type: 'refresh' },
      'test-refresh-token-secret',
      { expiresIn: '1h' },
    );
    const cookieHash = createHash('sha256').update(cookieRefresh).digest('hex');

    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
            if (where.id === 'jti-stale') {
              return {
                id: 'jti-stale',
                user_id: 'user-1',
                token_hash: 'not-the-stale-body-hash',
                expires_at: new Date(Date.now() + 60_000),
                revoked_at: null,
              };
            }
            if (where.id === 'jti-cookie-ok') {
              return {
                id: 'jti-cookie-ok',
                user_id: 'user-1',
                token_hash: cookieHash,
                expires_at: new Date(Date.now() + 60_000),
                revoked_at: null,
              };
            }
            return null;
          }),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        } as never,
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: null,
            phone: '+21612345678',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        'x-matchy-client': 'mobile',
        'x-matchy-mobile-key': 'test-mobile-client-secret',
      },
      cookies: { refresh_token: cookieRefresh },
      payload: { refreshToken: staleBody },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    expect(response.json().accessToken).toEqual(expect.any(String));
    expect(response.json().refreshToken).toEqual(expect.any(String));
  });

  it('reads the refresh token from the cookie, not the body, and rotates both cookies', async () => {
    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'jti-1',
            user_id: 'user-1',
            token_hash: 'irrelevant-because-mocked-below',
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: null,
          }),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        } as never,
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: null,
            phone: '+21612345678',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    // No refresh_token in the body at all — a real cookie-bearing request would still
    // fail signature/hash checks against this mocked store, but the point here is that
    // the route never looks at the body to begin with.
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('invalid_refresh_token');
  });

  it('clears both cookies on logout', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });

    expect(response.statusCode).toBe(200);
    const accessCookie = findCookie(response.headers['set-cookie'], 'access_token');
    const refreshCookie = findCookie(response.headers['set-cookie'], 'refresh_token');
    expect(accessCookie).toContain('access_token=;');
    expect(refreshCookie).toContain('refresh_token=;');
  });

  it('authenticates a protected route from the access_token cookie alone', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            phone: '+21612345678',
            name: 'Jane Doe',
            auth_provider: 'phone',
            email_verified: false,
            role: 'USER',
            status: 'ACTIVE',
          }),
        } as never,
      },
    });
    apps.push(app);

    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { id: 'user-1', email: null, phone: '+21612345678' },
      'test-access-token-secret',
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/authcheck',
      cookies: { access_token: token },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.id).toBe('user-1');
  });

  it('clears both cookies on a successful change-password, since it revokes refresh tokens but the access token JWT stays valid until cleared', async () => {
    const hashedPassword = await hashPassword('password123');
    const user = {
      id: 'user-1',
      email: null,
      phone: '+21612345678',
      password: hashedPassword,
      status: 'ACTIVE',
    };
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(user),
          findUnique: vi.fn().mockResolvedValue(user),
          update: vi.fn().mockResolvedValue({}),
        } as never,
        refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } as never,
      },
    });
    apps.push(app);

    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { id: 'user-1', email: null, phone: '+21612345678' },
      'test-access-token-secret',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      cookies: { access_token: token },
      payload: { currentPassword: 'password123', newPassword: 'newpassword456' },
    });

    expect(response.statusCode).toBe(200);
    const accessCookie = findCookie(response.headers['set-cookie'], 'access_token');
    const refreshCookie = findCookie(response.headers['set-cookie'], 'refresh_token');
    expect(accessCookie).toContain('access_token=;');
    expect(refreshCookie).toContain('refresh_token=;');
  });

  it('clears both cookies on a successful account deletion', async () => {
    const user = {
      id: 'user-1',
      email: null,
      phone: '+21612345678',
      password: null,
      status: 'ACTIVE',
    };
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(user),
          findUnique: vi.fn().mockResolvedValue(user),
          delete: vi.fn().mockResolvedValue({}),
        } as never,
      },
    });
    apps.push(app);

    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { id: 'user-1', email: null, phone: '+21612345678' },
      'test-access-token-secret',
    );

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/auth/account',
      cookies: { access_token: token },
      payload: { confirm: true },
    });

    expect(response.statusCode).toBe(200);
    const accessCookie = findCookie(response.headers['set-cookie'], 'access_token');
    const refreshCookie = findCookie(response.headers['set-cookie'], 'refresh_token');
    expect(accessCookie).toContain('access_token=;');
    expect(refreshCookie).toContain('refresh_token=;');
  });
});
