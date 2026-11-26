import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

function prismaCounting(count: number) {
  return { user: { count: vi.fn().mockResolvedValue(count) } as never };
}

describe('GET /api/v1/pros/count', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
    vi.restoreAllMocks();
  });

  it('is public and returns only a number, cacheable for a few minutes', async () => {
    const app = await buildTestApp({ prisma: prismaCounting(35) });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/pros/count?service=Plombier&city=Sousse',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: 'Plombier', city: 'Sousse', count: 35 });
    expect(response.headers['cache-control']).toBe('public, max-age=300');
  });

  it('requires both the service and the city', async () => {
    const app = await buildTestApp({ prisma: prismaCounting(0) });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/pros/count?service=Plombier',
    });

    expect(response.statusCode).toBe(400);
  });

  it('drops unknown query parameters (the schema allows only service and city)', async () => {
    const prisma = prismaCounting(3);
    const app = await buildTestApp({ prisma });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/pros/count?service=Plombier&city=Sousse&userId=1',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: 'Plombier', city: 'Sousse', count: 3 });
  });
});
