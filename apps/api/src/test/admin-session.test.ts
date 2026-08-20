import bcrypt from 'bcryptjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

/**
 * The admin panel's JWT used to be handed to the browser in the response body, then kept in
 * sessionStorage and in a JS-readable cookie — any injected script could lift it. It now
 * leaves the API only as an HttpOnly cookie, which is a property no mocked client can show:
 * it lives in the Set-Cookie header the browser acts on.
 */
const ADMIN_PASSWORD = 'matchy2026';

async function adminRow() {
  return {
    id: 'admin-1',
    email: 'admin@matchyplus.tn',
    name: 'Super Admin',
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    token_version: 0,
  };
}

async function buildAppWithAdmin() {
  const admin = await adminRow();
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(admin),
      findUnique: vi.fn().mockResolvedValue(admin),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    // issueTokenPair persists the refresh token now - same mock shape
    // already used in member-session.test.ts for the same reason.
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const app = await buildTestApp({ prisma: prisma as never });
  return { app, prisma };
}

function findCookie(setCookie: string | string[] | undefined, name: string) {
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
  return headers.find((header) => header.startsWith(`${name}=`)) ?? '';
}

function loginCookie(setCookie: string | string[] | undefined) {
  return findCookie(setCookie, 'admin_access_token');
}

function refreshCookie(setCookie: string | string[] | undefined) {
  return findCookie(setCookie, 'admin_refresh_token');
}

function cookieValue(cookie: string) {
  return cookie.split(';')[0]!.split('=')[1]!;
}

describe('admin session cookie', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  async function login() {
    const { app, prisma } = await buildAppWithAdmin();
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: { email: 'admin@matchyplus.tn', password: ADMIN_PASSWORD },
    });

    return { app, prisma, response };
  }

  it('returns the token as an HttpOnly cookie, never in the response body', async () => {
    const { response } = await login();

    expect(response.statusCode).toBe(200);
    expect(response.json()).not.toHaveProperty('access_token');
    expect(response.json().user.role).toBe('SUPER_ADMIN');

    const cookie = loginCookie(response.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
  });

  it('also sets the refresh token as its own HttpOnly cookie, scoped to the admin auth routes', async () => {
    const { response } = await login();

    const cookie = refreshCookie(response.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth/admin');
  });

  it('marks the cookie Secure and SameSite outside development', async () => {
    // NODE_ENV is 'test' in this suite, i.e. already "not development".
    const { response } = await login();
    const cookie = loginCookie(response.headers['set-cookie']);

    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('authenticates an admin route from the cookie alone, with no Authorization header', async () => {
    const { app, response } = await login();
    const token = cookieValue(loginCookie(response.headers['set-cookie']));

    const listed = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      cookies: { admin_access_token: token },
    });

    expect(listed.statusCode).toBe(200);
  });

  it('rejects an admin route when neither the cookie nor the header is present', async () => {
    const { app } = await buildAppWithAdmin();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/users' });

    expect(response.statusCode).toBe(401);
  });

  it('clears both cookies on logout, since only the API can drop an HttpOnly cookie', async () => {
    const { app } = await buildAppWithAdmin();
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/admin/logout' });

    expect(response.statusCode).toBe(200);
    const accessCookie = loginCookie(response.headers['set-cookie']);
    const refreshCookieHeader = refreshCookie(response.headers['set-cookie']);
    expect(accessCookie).toContain('admin_access_token=;');
    expect(accessCookie).toContain('HttpOnly');
    expect(refreshCookieHeader).toContain('admin_refresh_token=;');
    expect(refreshCookieHeader).toContain('HttpOnly');
  });

  describe('POST /api/v1/auth/admin/refresh', () => {
    it('rotates both cookies for a valid refresh token', async () => {
      const { app, prisma, response } = await login();
      const rawRefreshToken = cookieValue(refreshCookie(response.headers['set-cookie']));

      // Mirror the real create() call's shape so the refresh lookup matches by hash.
      const created = prisma.refreshToken.create.mock.calls[0]![0].data;
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: created.id,
        user_id: 'admin-1',
        token_hash: created.token_hash,
        expires_at: created.expires_at,
        revoked_at: null,
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const refreshed = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/admin/refresh',
        cookies: { admin_refresh_token: rawRefreshToken },
      });

      expect(refreshed.statusCode).toBe(200);
      expect(refreshed.json()).toEqual({ ok: true });
      expect(loginCookie(refreshed.headers['set-cookie'])).toContain('HttpOnly');
      expect(refreshCookie(refreshed.headers['set-cookie'])).toContain('HttpOnly');
    });

    it('rejects with 401 when there is no refresh cookie at all', async () => {
      const { app } = await buildAppWithAdmin();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/admin/refresh' });

      expect(response.statusCode).toBe(401);
    });
  });
});
