import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeolocationService } from './geolocation.js';

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(status: number): Response {
  return new Response(null, { status, headers: { 'content-type': 'application/json' } });
}

describe('GeolocationService', () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let service: GeolocationService;

  beforeEach(() => {
    fetchFn = vi.fn();
    service = new GeolocationService({ fetchFn: fetchFn as unknown as typeof globalThis.fetch });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getIpGeolocation', () => {
    it('returns location from the first provider that succeeds', async () => {
      fetchFn.mockResolvedValueOnce(
        okResponse({
          success: true,
          latitude: 48.8566,
          longitude: 2.3522,
          city: 'Paris',
          region: 'Île-de-France',
          country: 'France',
        }),
      );

      const result = await service.getIpGeolocation();

      expect(result).toEqual({
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

    it('accepts zero latitude/longitude (equator / prime meridian)', async () => {
      fetchFn.mockResolvedValueOnce(
        okResponse({
          success: true,
          latitude: 0,
          longitude: 0,
          city: 'Null Island',
          region: 'Atlantic',
          country: 'GH',
        }),
      );

      const result = await service.getIpGeolocation();

      expect(result.success).toBe(true);
      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
      expect(result.provider).toBe('ipwho.is');
    });

    it('encodes IPv6 addresses in provider URLs', async () => {
      fetchFn.mockResolvedValueOnce(
        okResponse({
          success: true,
          latitude: 1,
          longitude: 2,
          city: 'Test',
          region: 'R',
          country: 'C',
        }),
      );

      await service.getIpGeolocation('2001:db8::1');

      expect(fetchFn).toHaveBeenCalledWith(
        'https://ipwho.is/2001%3Adb8%3A%3A1',
        expect.anything(),
      );
    });

    it('falls back to the next provider when one fails', async () => {
      fetchFn
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(
          okResponse({
            latitude: 36.8065,
            longitude: 10.1815,
            city: 'Tunis',
            region: 'Tunis Governorate',
            country_name: 'Tunisia',
          }),
        );

      const result = await service.getIpGeolocation();

      expect(result).toEqual({
        success: true,
        provider: 'ipapi.co',
        latitude: 36.8065,
        longitude: 10.1815,
        city: 'Tunis',
        region: 'Tunis Governorate',
        country: 'Tunisia',
        formattedAddress: 'Tunis, Tunis Governorate, Tunisia',
      });
    });

    it('returns fallback when all providers fail', async () => {
      fetchFn.mockRejectedValue(new Error('network error'));

      const result = await service.getIpGeolocation();

      expect(result).toEqual({
        success: false,
        provider: null,
        latitude: null,
        longitude: null,
        city: null,
        region: null,
        country: null,
        formattedAddress: null,
        error: 'All IP geolocation providers failed',
        isDefault: false,
      });
    });

    it('skips provider that returns null from its parse function', async () => {
      fetchFn
        .mockResolvedValueOnce(okResponse({ success: false }))
        .mockResolvedValueOnce(
          okResponse({
            latitude: 34.0522,
            longitude: -118.2437,
            city: 'Los Angeles',
            region: 'California',
            country_name: 'United States',
          }),
        );

      const result = await service.getIpGeolocation();

      expect(result.provider).toBe('ipapi.co');
      expect(result.city).toBe('Los Angeles');
    });

    it('handles non-ok response by moving to next HTTPS provider', async () => {
      fetchFn
        .mockResolvedValueOnce(errorResponse(500))
        .mockResolvedValueOnce(okResponse({}))
        .mockResolvedValueOnce(
          okResponse({
            latitude: 40.7128,
            longitude: -74.006,
            cityName: 'New York',
            regionName: 'New York',
            countryName: 'United States',
          }),
        );

      const result = await service.getIpGeolocation();

      expect(result).toEqual({
        success: true,
        provider: 'freeipapi.com',
        latitude: 40.7128,
        longitude: -74.006,
        city: 'New York',
        region: 'New York',
        country: 'United States',
        formattedAddress: 'New York, New York, United States',
      });
    });

    it('never calls cleartext HTTP providers', async () => {
      fetchFn.mockRejectedValue(new Error('network error'));

      await service.getIpGeolocation('8.8.8.8');

      for (const call of fetchFn.mock.calls) {
        const url = String(call[0]);
        expect(url.startsWith('https://')).toBe(true);
        expect(url.includes('ip-api.com')).toBe(false);
      }
    });
  });

  describe('reverseGeocode', () => {
    it('returns address from the first provider that succeeds', async () => {
      fetchFn.mockResolvedValueOnce(
        okResponse({
          address: {
            city: 'Tunis',
            state: 'Tunis Governorate',
            country: 'Tunisia',
          },
          display_name: 'Tunis, Tunisia',
        }),
      );

      const result = await service.reverseGeocode(36.8065, 10.1815);

      expect(result).toEqual({
        success: true,
        provider: 'nominatim',
        city: 'Tunis',
        region: 'Tunis Governorate',
        country: 'Tunisia',
        formattedAddress: 'Tunis, Tunisia',
      });
    });

    it('falls back when Nominatim returns no address', async () => {
      fetchFn
        .mockResolvedValueOnce(okResponse({}))
        .mockResolvedValueOnce(
          okResponse({
            city: 'Sfax',
            principalSubdivision: 'Sfax Governorate',
            countryName: 'Tunisia',
          }),
        );

      const result = await service.reverseGeocode(34.7406, 10.7603);

      expect(result).toEqual({
        success: true,
        provider: 'bigdatacloud',
        city: 'Sfax',
        region: 'Sfax Governorate',
        country: 'Tunisia',
        formattedAddress: 'Sfax, Sfax Governorate, Tunisia',
      });
    });

    it('returns coordinates-based fallback when all providers fail', async () => {
      fetchFn.mockRejectedValue(new Error('network error'));

      const result = await service.reverseGeocode(36.8065, 10.1815);

      expect(result).toEqual({
        success: false,
        provider: null,
        city: 'Unknown Location',
        region: null,
        country: null,
        formattedAddress: '36.8065, 10.1815',
        error: 'Reverse geocoding failed',
      });
    });

    it('uses custom headers for nominatim', async () => {
      fetchFn.mockResolvedValue(
        okResponse({
          address: { city: 'London', state: 'England', country: 'United Kingdom' },
          display_name: 'London, UK',
        }),
      );

      await service.reverseGeocode(51.5074, -0.1278);

      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('MatchyPlus'),
          }),
        }),
      );
    });
  });
});
