import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';
import { signTestAccessToken } from './sign-test-access-token.js';

// verifyToken (apps/api/src/plugins/authorization.ts) reloads the caller's own row via
// findUniqueOrThrow on every request to re-check ACTIVE status — every test needs this
// mocked regardless of what the route handler itself queries, or auth fails with a
// misleading 401 before the route logic ever runs.
function findUniqueOrThrowForAnyCaller() {
  return vi
    .fn()
    .mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER', token_version: 0 }),
    );
}

describe('GET /api/v1/notifications', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/notifications' });

    expect(response.statusCode).toBe(401);
  });

  it("lists the caller's notifications, most recent first, with an unread count", async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z').toISOString();
    const app = await buildTestApp({
      prisma: {
        user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never,
        notification: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'notif-1',
              type: 'PROFILE_VIEW',
              data: { viewerId: 'user-2', viewerName: 'Jane Doe' },
              read_at: null,
              created_at: createdAt,
            },
          ]),
          count: vi.fn().mockResolvedValue(1),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${signTestAccessToken('user-1')}` },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      notifications: [
        {
          id: 'notif-1',
          type: 'PROFILE_VIEW',
          data: { viewerId: 'user-2', viewerName: 'Jane Doe' },
          read: false,
        },
      ],
      unread_count: 1,
    });
  });
});

describe('POST /api/v1/notifications/:id/read', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('marks the given notification as read', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const app = await buildTestApp({
      prisma: {
        user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never,
        notification: { updateMany } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/notif-1/read',
      headers: { authorization: `Bearer ${signTestAccessToken('user-1')}` },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toEqual({ marked: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-1', user_id: 'user-1' },
      data: { read_at: expect.any(Date) },
    });
  });

  it('returns 404 when the notification does not belong to the caller', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never,
        notification: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/notif-1/read',
      headers: { authorization: `Bearer ${signTestAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'notification_not_found' });
  });
});

describe('POST /api/v1/notifications/read-all', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('marks every unread notification for the caller as read', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const app = await buildTestApp({
      prisma: {
        user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never,
        notification: { updateMany } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: { authorization: `Bearer ${signTestAccessToken('user-1')}` },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toEqual({ marked: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { user_id: 'user-1', read_at: null },
      data: { read_at: expect.any(Date) },
    });
  });
});
