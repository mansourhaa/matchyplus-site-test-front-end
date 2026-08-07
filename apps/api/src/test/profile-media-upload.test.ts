import jwt from 'jsonwebtoken';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PHOTOS_DIR, VIDEOS_DIR } from '../utils/media-storage.js';
import { buildTestApp } from './build-test-app.js';

function signAccessToken(userId: string) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, 'test-access-token-secret');
}

function findUniqueOrThrowForAnyCaller() {
  return vi
    .fn()
    .mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER' }),
    );
}

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00]);
const MP4_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x00, 0x00, 0x00, 0x00,
]);

function photoFormData() {
  const form = new FormData();
  form.append('photo', new Blob([JPEG_BYTES], { type: 'image/jpeg' }), 'photo.jpg');
  return form;
}

function videoFormData() {
  const form = new FormData();
  form.append('video', new Blob([MP4_BYTES], { type: 'video/mp4' }), 'video.mp4');
  return form;
}

describe('POST/DELETE /api/v1/users/me/profile/photo', () => {
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
      url: '/api/v1/users/me/profile/photo',
      payload: photoFormData(),
    });

    expect(response.statusCode).toBe(401);
  });

  it('uploads a valid photo and stores its served path on User.image', async () => {
    const updateMock = vi.fn().mockResolvedValue({});
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockImplementation(({ where }) => {
            if (where.id === 'user-1')
              return Promise.resolve({ id: 'user-1', status: 'ACTIVE', image: null });
            return Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER' });
          }),
          update: updateMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile/photo',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: photoFormData(),
    });

    try {
      expect(response.statusCode).toBe(200);
      expect(response.json().image).toMatch(/^\/uploads\/photos\/.+\.jpg$/);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { image: expect.stringMatching(/^\/uploads\/photos\/.+\.jpg$/) },
      });
    } finally {
      const savedFilename = response.json().image?.split('/').pop();
      if (savedFilename) await rm(join(PHOTOS_DIR, savedFilename), { force: true });
    }
  });

  it('rejects a non-image file with 400 and does not touch the database', async () => {
    const updateMock = vi.fn();
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: findUniqueOrThrowForAnyCaller(),
          update: updateMock,
        } as never,
      },
    });
    apps.push(app);

    const form = new FormData();
    form.append('photo', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }), 'x.jpg');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile/photo',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects a missing file with 400', async () => {
    const app = await buildTestApp({
      prisma: { user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile/photo',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: new FormData(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'photo_required' });
  });

  it('deletes the current photo and nulls User.image', async () => {
    const updateMock = vi.fn().mockResolvedValue({});
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockImplementation(({ where }) => {
            if (where.id === 'user-1') {
              return Promise.resolve({
                id: 'user-1',
                status: 'ACTIVE',
                image: 'data:image/png;base64,abc',
              });
            }
            return Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER' });
          }),
          update: updateMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me/profile/photo',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ image: null });
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { image: null } });
  });
});

describe('POST/DELETE /api/v1/users/me/profile/video', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('uploads a valid video and stores its served path on User.video', async () => {
    const updateMock = vi.fn().mockResolvedValue({});
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockImplementation(({ where }) => {
            if (where.id === 'user-1')
              return Promise.resolve({ id: 'user-1', status: 'ACTIVE', video: null });
            return Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER' });
          }),
          update: updateMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile/video',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: videoFormData(),
    });

    try {
      expect(response.statusCode).toBe(200);
      expect(response.json().video).toMatch(/^\/uploads\/videos\/.+\.mp4$/);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { video: expect.stringMatching(/^\/uploads\/videos\/.+\.mp4$/) },
      });
    } finally {
      const savedFilename = response.json().video?.split('/').pop();
      if (savedFilename) await rm(join(VIDEOS_DIR, savedFilename), { force: true });
    }
  });

  it('rejects a missing file with 400', async () => {
    const app = await buildTestApp({
      prisma: { user: { findUniqueOrThrow: findUniqueOrThrowForAnyCaller() } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile/video',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
      payload: new FormData(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'video_required' });
  });

  it('deletes the current video and nulls User.video', async () => {
    const updateMock = vi.fn().mockResolvedValue({});
    const app = await buildTestApp({
      prisma: {
        user: {
          findUniqueOrThrow: vi.fn().mockImplementation(({ where }) => {
            if (where.id === 'user-1') {
              return Promise.resolve({ id: 'user-1', status: 'ACTIVE', video: null });
            }
            return Promise.resolve({ id: where.id, status: 'ACTIVE', role: 'USER' });
          }),
          update: updateMock,
        } as never,
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me/profile/video',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ video: null });
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { video: null } });
  });
});
