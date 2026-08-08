import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

function signAccessToken(userId: string) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, 'test-access-token-secret');
}

function findUniqueOrThrowForAnyCaller(overrides: Record<string, unknown> = {}) {
  return vi
    .fn()
    .mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER', ...overrides }),
    );
}

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00]);

function selfieFormData() {
  const form = new FormData();
  form.append('selfie', new Blob([JPEG_BYTES], { type: 'image/jpeg' }), 'selfie.jpg');
  return form;
}

describe('POST /api/v1/users/me/identity-verification', () => {
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
      url: '/api/v1/users/me/identity-verification',
      payload: selfieFormData(),
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects a missing selfie with 400', async () => {
    const app = await buildTestApp({
      prisma: { user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/identity-verification',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: new FormData(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'selfie_required' });
  });

  it('rejects a non-image file with 400', async () => {
    const app = await buildTestApp({
      prisma: { user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never },
    });
    apps.push(app);

    const form = new FormData();
    form.append(
      'selfie',
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }),
      'x.jpg',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/identity-verification',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects when the caller has no real uploaded profile photo yet', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller({ image: null }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/identity-verification',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: selfieFormData(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'profile_photo_required' });
  });

  it('surfaces 503 AI_QUEUE_UNAVAILABLE when a valid selfie can still not be queued (no Redis configured in this test run)', async () => {
    // isStoredMediaPath requires the real UUID-shaped filename saveMediaFile produces —
    // a made-up name like "owner.jpg" would (correctly) be rejected as not a real
    // uploaded photo, which is a different code path than the one under test here.
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller({
            image: '/uploads/photos/8c9c6f2a-1b3d-4a5e-9f6a-2d4b6c8e0a1b.jpg',
          }),
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/identity-verification',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: selfieFormData(),
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: 'AI_QUEUE_UNAVAILABLE' });
  });
});

describe('GET /api/v1/users/me/identity-verification/:jobId', () => {
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
      url: '/api/v1/users/me/identity-verification/job-1',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 404 for a job that does not exist (or does not belong to the caller)', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never,
        aiJob: { findFirst: vi.fn().mockResolvedValue(null) } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/identity-verification/does-not-exist',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'job_not_found' });
  });
});
