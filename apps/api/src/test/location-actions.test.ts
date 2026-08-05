import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from './build-test-app.js';

function signAccessToken(userId: string) {
  return jwt.sign({ id: userId, email: 'user@example.com' }, 'test-access-token-secret');
}

function activeUserPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'user-1', status: 'ACTIVE' }),
    } as never,
  };
}

describe('GET /api/v1/location/ip-geolocation', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
    vi.restoreAllMocks();
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns geolocation data when authenticated', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          latitude: 48.8566,
          longitude: 2.3522,
          city: 'Paris',
          region: 'Île-de-France',
          country: 'France',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({
      success: true,
      provider: 'ipwho.is',
      latitude: 48.8566,
      longitude: 2.3522,
      city: 'Paris',
      region: 'Île-de-France',
      country: 'France',
      formattedAddress: 'Paris, Île-de-France, France',
    });
  });

  it('returns fallback when all providers fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toMatchObject({
      success: false,
      error: 'All IP geolocation providers failed',
    });
  });

  it('uses the requester IP when no ip query param is provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          latitude: 36.8065,
          longitude: 10.1815,
          city: 'Tunis',
          region: 'Tunis',
          country: 'Tunisia',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation',
      headers: {
        authorization: `Bearer ${signAccessToken('user-1')}`,
        'x-forwarded-for': '203.0.113.42',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('https://ipwho.is/203.0.113.42', expect.anything());
  });

  it('falls back to requester IP when ip query is empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          latitude: 36.8065,
          longitude: 10.1815,
          city: 'Tunis',
          region: 'Tunis',
          country: 'Tunisia',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation?ip=',
      headers: {
        authorization: `Bearer ${signAccessToken('user-1')}`,
        'x-forwarded-for': '203.0.113.42',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('https://ipwho.is/203.0.113.42', expect.anything());
  });

  it('prefers a valid ip query param over the requester IP', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          latitude: 48.8566,
          longitude: 2.3522,
          city: 'Paris',
          region: 'Île-de-France',
          country: 'France',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation?ip=8.8.8.8',
      headers: {
        authorization: `Bearer ${signAccessToken('user-1')}`,
        'x-forwarded-for': '203.0.113.42',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('https://ipwho.is/8.8.8.8', expect.anything());
  });

  it('rejects invalid ip query values', async () => {
    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation?ip=not-an-ip',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_ip' });
  });

  it('does not call upstream when client IP cannot be determined', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/ip-geolocation',
      remoteAddress: 'not-a-valid-ip',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.json()).toMatchObject({
      success: false,
      error: 'Unable to determine client IP',
    });
  });
});

describe('GET /api/v1/location/reverse-geocode', () => {
  const apps: Awaited<ReturnType<typeof buildTestApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
    vi.restoreAllMocks();
  });

  it('requires authentication', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/reverse-geocode?lat=36.8065&lon=10.1815',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when lat is missing', async () => {
    const app = await buildTestApp({});
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/reverse-geocode?lon=10.1815',
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when lat or lon are not valid numbers', async () => {
    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/reverse-geocode?lat=abc&lon=10.1815',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when coordinates are out of range', async () => {
    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/reverse-geocode?lat=91&lon=10',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns geocoded address when authenticated and valid coords', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          address: { city: 'Tunis', state: 'Tunis Governorate', country: 'Tunisia' },
          display_name: 'Tunis, Tunisia',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/reverse-geocode?lat=36.8065&lon=10.1815',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toEqual({
      success: true,
      provider: 'nominatim',
      city: 'Tunis',
      region: 'Tunis Governorate',
      country: 'Tunisia',
      formattedAddress: 'Tunis, Tunisia',
    });
  });

  it('accepts zero coordinates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          address: { city: 'Null Island', country: 'GH' },
          display_name: 'Null Island',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const app = await buildTestApp({ prisma: activeUserPrisma() });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/location/reverse-geocode?lat=0&lon=0',
      headers: { authorization: `Bearer ${signAccessToken('user-1')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().city).toBe('Null Island');
  });
});
