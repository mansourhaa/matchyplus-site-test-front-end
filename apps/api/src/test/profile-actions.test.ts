import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@saas-boilerplate/types';

import { PHOTOS_DIR, VIDEOS_DIR } from '../utils/media-storage.js';
import { buildTestApp } from './build-test-app.js';

function signAccessToken(userId: string) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, 'test-access-token-secret');
}

// verifyToken (apps/api/src/plugins/authorization.ts) reloads the caller's own row via
// findUniqueOrThrow on every request to re-check ACTIVE status — every test needs this
// mocked regardless of what the route handler itself queries, or auth fails with a
// misleading 401 before the route logic ever runs.
function findUniqueOrThrowForAnyCaller() {
  return vi
    .fn()
    .mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER' }),
    );
}

const activeUser = {
  id: 'user-2',
  name: 'Jane Doe',
  job: 'Électricien',
  bio: 'Bio text',
  image: '/uploads/photos/abc.jpg',
  video: null,
  city: 'Tunis',
  interests: ['Bricolage'],
  languages: ['fr'],
  contact_modes: ['whatsapp'],
  offer_service: false,
  service_type: null,
  price: null,
  profile_type: 'INDIVIDUAL',
  rating: 0,
  reviews: 0,
  availability_days: [],
  availability_hours: [],
  status: 'ACTIVE',
};

describe('GET /api/v1/profiles/:id', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/profiles/user-2' });

    expect(response.statusCode).toBe(401);
  });

  it("returns another user's public profile when not blocked", async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findUnique: vi.fn().mockResolvedValue(activeUser),
        } as never,
        userBlock: { findFirst: vi.fn().mockResolvedValue(null) } as never,
        match: { findUnique: vi.fn().mockResolvedValue(null) } as never,
        rating: { findUnique: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/user-2',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      id: 'user-2',
      name: 'Jane Doe',
      rating: null,
      matched: false,
      viewer_has_rated: false,
    });
  });

  it('rejects with 403 when a block exists between viewer and target', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findUnique: vi.fn(),
        } as never,
        userBlock: { findFirst: vi.fn().mockResolvedValue({ id: 'block-1' }) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/user-2',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'blocked' });
  });

  it('returns 404 for a profile that does not exist', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findUnique: vi.fn().mockResolvedValue(null),
        } as never,
        userBlock: { findFirst: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/user-2',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'profile_not_found' });
  });
});

describe('POST /api/v1/profiles/:id/view', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/api/v1/profiles/user-2/view' });

    expect(response.statusCode).toBe(401);
  });

  it('is a no-op when viewing your own profile', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never,
        notification: { create: vi.fn() } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-1/view',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ notified: false });
  });

  it('creates a notification for the target when the view is allowed', async () => {
    const notificationCreate = vi.fn().mockResolvedValue({ id: 'notif-1' });
    const prismaOverrides = {
      user: {
        findUniqueOrThrow: vi.fn().mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(
            where.id === 'user-1'
              ? {
                  id: 'user-1',
                  status: 'ACTIVE',
                  role: 'USER',
                  name: 'Jane Doe',
                  image: '/uploads/photos/jane.jpg',
                }
              : { id: where.id, status: 'ACTIVE', role: 'USER' },
          ),
        ),
        findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
      userBlock: { findFirst: vi.fn().mockResolvedValue(null) },
      notification: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: notificationCreate,
      },
    };
    const app = await buildTestApp({
      prisma: {
        ...prismaOverrides,
        $transaction: vi
          .fn()
          .mockImplementation(async (callback) => callback(prismaOverrides)) as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/view',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toEqual({ notified: true });
    expect(notificationCreate).toHaveBeenCalledWith({
      data: {
        user_id: 'user-2',
        type: 'PROFILE_VIEW',
        data: { viewerId: 'user-1', viewerName: 'Jane', viewerImage: '/uploads/photos/jane.jpg' },
      },
    });
  });

  it('does not create a second notification when the same viewer reopens the profile within the cooldown', async () => {
    const notificationCreate = vi.fn();
    const prismaOverrides = {
      user: {
        findUniqueOrThrow: vi
          .fn()
          .mockImplementation(({ where }: { where: { id: string } }) =>
            Promise.resolve(
              where.id === 'user-1'
                ? { id: 'user-1', status: 'ACTIVE', role: 'USER', name: 'Jane Doe', image: null }
                : { id: where.id, status: 'ACTIVE', role: 'USER' },
            ),
          ),
        findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
      userBlock: { findFirst: vi.fn().mockResolvedValue(null) },
      notification: {
        findFirst: vi.fn().mockResolvedValue({ id: 'existing-notif' }),
        create: notificationCreate,
      },
    };
    const app = await buildTestApp({
      prisma: {
        ...prismaOverrides,
        $transaction: vi
          .fn()
          .mockImplementation(async (callback) => callback(prismaOverrides)) as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/view',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toEqual({ notified: false });
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it('rejects with 403 when the target has blocked the viewer', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never,
        userBlock: { findFirst: vi.fn().mockResolvedValue({ id: 'block-1' }) } as never,
        notification: { create: vi.fn() } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/view',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'blocked' });
  });
});

describe('GET /api/v1/profiles/media/photos/:filename', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('rejects a path-traversal filename before touching the filesystem', async () => {
    const app = await buildTestApp({
      prisma: { user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/media/photos/..%2F..%2Fpackage.json',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('serves an existing photo to its active owner', async () => {
    await mkdir(PHOTOS_DIR, { recursive: true });
    const filename = `${randomUUID()}.jpg`;
    const filePath = join(PHOTOS_DIR, filename);
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff]));

    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findFirst: vi.fn().mockResolvedValue({ id: 'user-1' }),
          findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
        } as never,
      },
    });
    apps.push(app);

    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/media/photos/${filename}`,
        headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      });

      expect(response.statusCode, response.body).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
    } finally {
      await rm(filePath, { force: true });
    }
  });

  it('returns 404 for a photo that does not exist on disk', async () => {
    const filename = `${randomUUID()}.jpg`;
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findFirst: vi.fn().mockResolvedValue({ id: 'user-1' }),
          findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/profiles/media/photos/${filename}`,
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode, response.body).toBe(404);
  });

  it('denies a blocked viewer even when the file exists', async () => {
    const filename = `${randomUUID()}.jpg`;
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findFirst: vi.fn().mockResolvedValue({ id: 'owner-1' }),
        } as never,
        userBlock: { findFirst: vi.fn().mockResolvedValue({ id: 'block-1' }) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/profiles/media/photos/${filename}`,
      headers: { authorization: `Bearer ${signAccessToken('viewer-1')}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'blocked' });
  });
});

describe('GET /api/v1/profiles/media/videos/:filename', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('allows the owner to stream their own video', async () => {
    await mkdir(VIDEOS_DIR, { recursive: true });
    const filename = `${randomUUID()}.mp4`;
    const filePath = join(VIDEOS_DIR, filename);
    await writeFile(filePath, Buffer.from('fake video bytes'));

    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findFirst: vi.fn().mockResolvedValue({ id: 'user-1' }),
        } as never,
      },
    });
    apps.push(app);

    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/media/videos/${filename}`,
        headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('video/mp4');
    } finally {
      await rm(filePath, { force: true });
    }
  });

  it('rejects a viewer with no active match to the owner', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findFirst: vi.fn().mockResolvedValue({ id: 'owner-1' }),
        } as never,
        match: { findUnique: vi.fn().mockResolvedValue(null) } as never,
        conversation: { findUnique: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/media/videos/some-video.mp4',
      headers: { authorization: `Bearer ${signAccessToken('viewer-1')}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'video_access_denied' });
  });

  it('streams a byte range to a viewer with an active match', async () => {
    await mkdir(VIDEOS_DIR, { recursive: true });
    const filename = `${randomUUID()}.mp4`;
    const filePath = join(VIDEOS_DIR, filename);
    await writeFile(filePath, Buffer.from('0123456789'));

    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findFirst: vi.fn().mockResolvedValue({ id: 'owner-1' }),
        } as never,
        match: { findUnique: vi.fn().mockResolvedValue({ id: 'match-1' }) } as never,
      },
    });
    apps.push(app);

    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/media/videos/${filename}`,
        headers: {
          cookie: `access_token=${signAccessToken('viewer-1')}`,
          range: 'bytes=2-5',
        },
      });

      expect(response.statusCode, response.body).toBe(206);
      expect(response.headers['content-range']).toBe('bytes 2-5/10');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.body).toBe('2345');
    } finally {
      await rm(filePath, { force: true });
    }
  });

  it('returns 404 when no user references the requested filename', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          findFirst: vi.fn().mockResolvedValue(null),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/media/videos/unknown.mp4',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/v1/profiles/:id/rating', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/rating',
      payload: { rating: 5 },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects a rating outside 1-5 before touching the database', async () => {
    const app = await buildTestApp({
      prisma: { user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/rating',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: { rating: 6 },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects rating a profile you have a block with, checked inside the transaction', async () => {
    const prisma = {
      user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() },
      userBlock: { findFirst: vi.fn().mockResolvedValue({ id: 'block-1' }) },
      match: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
    );
    const app = await buildTestApp({ prisma: prisma as never });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/rating',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: { rating: 5 },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'blocked' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.match.findUnique).not.toHaveBeenCalled();
  });

  it('rejects rating a profile you are not matched with', async () => {
    const prisma = {
      user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() },
      userBlock: { findFirst: vi.fn().mockResolvedValue(null) },
      match: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
    );
    const app = await buildTestApp({ prisma: prisma as never });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/rating',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: { rating: 5 },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'not_matched' });
  });

  it('maps a concurrent duplicate rating to a clean already_rated conflict, not a raw 500', async () => {
    const uniqueViolation = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const prisma = {
      user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() },
      userBlock: { findFirst: vi.fn().mockResolvedValue(null) },
      match: { findUnique: vi.fn().mockResolvedValue({ id: 'match-1' }) },
      rating: { create: vi.fn().mockRejectedValue(uniqueViolation) },
      $queryRaw: vi.fn().mockResolvedValue(undefined),
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
    );
    const app = await buildTestApp({ prisma: prisma as never });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/rating',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: { rating: 5 },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'already_rated' });
  });

  it('rates a matched profile and returns the recomputed average', async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
        update: vi.fn().mockResolvedValue({}),
      },
      userBlock: { findFirst: vi.fn().mockResolvedValue(null) },
      match: { findUnique: vi.fn().mockResolvedValue({ id: 'match-1' }) },
      rating: {
        create: vi.fn().mockResolvedValue({ id: 'rating-1' }),
        aggregate: vi.fn().mockResolvedValue({ _avg: { value: 4 }, _count: 1 }),
      },
      $queryRaw: vi.fn().mockResolvedValue(undefined),
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
    );
    const app = await buildTestApp({ prisma: prisma as never });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/user-2/rating',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: { rating: 4 },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toEqual({ rating: 4, reviews: 1 });
  });
});
