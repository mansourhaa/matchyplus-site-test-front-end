import { readdir } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ONBOARDING_CLIPS_DIR } from '../utils/media-storage.js';
import { buildTestApp } from './build-test-app.js';

const MP4_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x00, 0x00, 0x00, 0x00,
]);

function clipForm(uiLocale?: string) {
  const form = new FormData();
  form.append('video', new Blob([MP4_BYTES], { type: 'video/mp4' }), 'clip.mp4');
  if (uiLocale) form.append('uiLocale', uiLocale);
  return form;
}

async function clipFiles() {
  try {
    return await readdir(ONBOARDING_CLIPS_DIR);
  } catch {
    return [];
  }
}

describe('POST /api/v1/onboarding/video-analysis', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('needs no account, and leaves no clip behind when the queue is down (no Redis here)', async () => {
    const app = await buildTestApp({});
    apps.push(app);
    const before = await clipFiles();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/video-analysis',
      payload: clipForm('ar'),
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: 'AI_QUEUE_UNAVAILABLE' });
    expect(await clipFiles()).toEqual(before);
  });

  it('rejects a request without a video', async () => {
    const app = await buildTestApp({});
    apps.push(app);
    const form = new FormData();
    form.append('uiLocale', 'fr');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/video-analysis',
      payload: form,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'video_required' });
  });

  it('rejects an unknown locale', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/video-analysis',
      payload: clipForm('de'),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_locale' });
  });
});

describe('GET /api/v1/onboarding/video-analysis/:jobId', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];
  const token = 'f'.repeat(48);
  const now = new Date();
  const storedJob = {
    id: 'job-1',
    type: 'ANALYZE_VIDEO',
    status: 'SUCCEEDED',
    userId: null,
    payload: { accessToken: token },
    result: { ok: true, profile: { first_name: { value: 'Hela', status: 'fill' } } },
    error: null,
    createdAt: now,
    updatedAt: now,
  };

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it('requires the token', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/onboarding/video-analysis/job-1',
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 404 for a wrong token', async () => {
    const app = await buildTestApp({
      prisma: { aiJob: { findUnique: vi.fn().mockResolvedValue(storedJob) } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/onboarding/video-analysis/job-1?token=${'0'.repeat(48)}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'job_not_found' });
  });

  it('returns the job and its result for the right token, without the payload', async () => {
    const app = await buildTestApp({
      prisma: { aiJob: { findUnique: vi.fn().mockResolvedValue(storedJob) } as never },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/onboarding/video-analysis/job-1?token=${token}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.job).toMatchObject({ id: 'job-1', status: 'SUCCEEDED' });
    expect(body.job.result.profile.first_name.value).toBe('Hela');
    expect(JSON.stringify(body)).not.toContain(token);
  });
});

describe('POST /api/v1/onboarding/relabel', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
    vi.unstubAllGlobals();
  });

  it('needs no account and returns the fields in the requested language', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          fields: { city: { value: 'Sousse', review: false } },
          serviceId: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/relabel',
      payload: { values: { city: 'سوسة' }, uiLocale: 'fr', aiFields: ['city'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      fields: { city: { value: 'Sousse', review: false } },
      suggestions: {},
      serviceId: null,
    });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/relabel$/);
  });

  it('never forwards unknown fields, and rejects unknown locales', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, fields: {}, serviceId: null }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const app = await buildTestApp({});
    apps.push(app);

    const unknownField = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/relabel',
      payload: { values: { city: 'سوسة', password: 'x' }, uiLocale: 'fr' },
    });
    const unknownLocale = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/relabel',
      payload: { values: { city: 'Sousse' }, uiLocale: 'de' },
    });

    expect(unknownField.statusCode).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).values).toEqual({ city: 'سوسة' });
    expect(unknownLocale.statusCode).toBe(400);
  });

  it('surfaces 503 VOICE_AI_UNAVAILABLE when the voice service is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/relabel',
      payload: { values: { city: 'سوسة' }, uiLocale: 'en' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: 'VOICE_AI_UNAVAILABLE' });
  });
});
