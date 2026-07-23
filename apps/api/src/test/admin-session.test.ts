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
  };
}

async function buildAppWithAdmin() {
  const admin = await adminRow();
  return buildTestApp({
    prisma: {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(admin),
        findUnique: vi.fn().mockResolvedValue(admin),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    } as never,
  });
}

function loginCookie(setCookie: string | string[] | undefined) {
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
  return headers.find((header) => header.startsWith('admin_access_token=')) ?? '';
}

describe('admin session cookie', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  async function login() {
    const app = await buildAppWithAdmin();
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: { email: 'admin@matchyplus.tn', password: ADMIN_PASSWORD },
    });

    return { app, response };
  }

  it('returns the token as an HttpOnly cookie, never in the response body', async () => {
    const { response } = await login();

    expect(response.statusCode).toBe(200);
    expect(response.json()).not.toHaveProperty('access_token');
    expect(response.json().user.role).toBe('SUPER_ADMIN');

    const cookie = loginCookie(response.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
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
    const cookie = loginCookie(response.headers['set-cookie']);
    const token = cookie.split(';')[0]!.split('=')[1]!;

    const listed = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      cookies: { admin_access_token: token },
    });

    expect(listed.statusCode).toBe(200);
  });

  it('rejects an admin route when neither the cookie nor the header is present', async () => {
    const app = await buildAppWithAdmin();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/users' });

    expect(response.statusCode).toBe(401);
  });

  it('clears the cookie on logout, since only the API can drop an HttpOnly cookie', async () => {
    const app = await buildAppWithAdmin();
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/admin/logout' });

    expect(response.statusCode).toBe(200);
    const cookie = loginCookie(response.headers['set-cookie']);
    expect(cookie).toContain('admin_access_token=;');
    expect(cookie).toContain('HttpOnly');
  });
});
