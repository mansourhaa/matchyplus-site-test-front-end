import {
  IP_GEOLOCATION_TIMEOUT_MS,
  NOMINATIM_USER_AGENT,
  REVERSE_GEOCODE_TIMEOUT_MS,
} from '../constants.js';
import { IpGeolocationResult, ReverseGeocodeResult } from '../types/geolocation.js';
import { formatAddressParts, parseLatLon } from '../utils/geo-coords.js';
import { encodeIpForPath } from '../utils/ip.js';

type ParsedIpLocation = {
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
};

type ParsedReverseLocation = {
  city: string;
  region: string | null;
  country: string | null;
  formattedAddress: string;
};

type IpProvider = {
  name: string;
  url: (ip: string) => string;
  parse: (data: Record<string, unknown>) => ParsedIpLocation | null;
};

type ReverseProvider = {
  name: string;
  url: (lat: number, lon: number) => string;
  headers?: Record<string, string>;
  parse: (data: Record<string, unknown>) => ParsedReverseLocation | null;
};

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanGovernorateName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  if (!cleaned) return null;

  // French prefixes: "Gouvernorat de Tunis", "Gouvernorat de l'Ariana", "Gouvernorat d'Ariana", "Gouvernorat Sfax"
  cleaned = cleaned.replace(/^Gouvernorat\s+(?:de\s+l[’']|de\s+|d[’']|du\s+)?/i, '').trim();
  // Arabic prefixes: "ولاية تونس"
  cleaned = cleaned.replace(/^ولاية\s+/u, '').trim();

  return cleaned.length > 0 ? cleaned : null;
}

function resolveCityAndRegion(
  candidateCity: string | null | undefined,
  rawState: string | null | undefined,
  rawRegion: string | null | undefined,
  rawCountry: string | null | undefined,
): { city: string; region: string | null; country: string | null } | null {
  const country = asNullableString(rawCountry);
  const cleanedState = cleanGovernorateName(rawState) ?? asNullableString(rawState);
  const cleanedRegion = cleanGovernorateName(rawRegion) ?? asNullableString(rawRegion);
  const stateOrRegion = cleanedState ?? cleanedRegion;

  let city = asNullableString(candidateCity);
  if (city) {
    city = cleanGovernorateName(city) ?? city;
  }

  // If city is the country name (e.g. "Tunisia", "Tunisie"), prioritize the governorate / state / region
  if (city && country && city.toLowerCase() === country.toLowerCase()) {
    city = stateOrRegion ?? city;
  }

  // If no city found, fallback to governorate / state
  if (!city) {
    city = stateOrRegion ?? country;
  }

  if (!city) return null;

  return {
    city,
    region: rawState ?? rawRegion ?? stateOrRegion,
    country,
  };
}

/**
 * HTTPS-only IP geolocation providers (cleartext HTTP providers are intentionally omitted).
 * Order = preferred failover sequence.
 */
const IP_PROVIDERS: IpProvider[] = [
  {
    name: 'ipwho.is',
    url: (ip) => `https://ipwho.is/${encodeIpForPath(ip)}`,
    parse: (d) => {
      if (d.success === false) return null;
      const coords = parseLatLon(d.latitude, d.longitude);
      if (!coords) return null;
      const loc = resolveCityAndRegion(
        asNullableString(d.city),
        asNullableString(d.region),
        asNullableString(d.region),
        asNullableString(d.country),
      );
      return {
        ...coords,
        city: loc?.city ?? asNullableString(d.city),
        region: loc?.region ?? asNullableString(d.region),
        country: loc?.country ?? asNullableString(d.country),
      };
    },
  },
  {
    name: 'ipapi.co',
    url: (ip) => `https://ipapi.co/${encodeIpForPath(ip)}/json/`,
    parse: (d) => {
      if (typeof d.error === 'boolean' && d.error) return null;
      const coords = parseLatLon(d.latitude, d.longitude);
      if (!coords) return null;
      const loc = resolveCityAndRegion(
        asNullableString(d.city),
        asNullableString(d.region),
        asNullableString(d.region),
        asNullableString(d.country_name) ?? asNullableString(d.country),
      );
      return {
        ...coords,
        city: loc?.city ?? asNullableString(d.city),
        region: loc?.region ?? asNullableString(d.region),
        country: loc?.country ?? asNullableString(d.country_name) ?? asNullableString(d.country),
      };
    },
  },
  {
    name: 'freeipapi.com',
    url: (ip) => `https://freeipapi.com/api/json/${encodeIpForPath(ip)}`,
    parse: (d) => {
      const coords = parseLatLon(d.latitude, d.longitude);
      if (!coords) return null;
      const loc = resolveCityAndRegion(
        asNullableString(d.cityName) ?? asNullableString(d.city),
        asNullableString(d.regionName) ?? asNullableString(d.region),
        asNullableString(d.regionName) ?? asNullableString(d.region),
        asNullableString(d.countryName) ?? asNullableString(d.country),
      );
      return {
        ...coords,
        city: loc?.city ?? asNullableString(d.cityName) ?? asNullableString(d.city),
        region: loc?.region ?? asNullableString(d.regionName) ?? asNullableString(d.region),
        country: loc?.country ?? asNullableString(d.countryName) ?? asNullableString(d.country),
      };
    },
  },
];

const REVERSE_PROVIDERS: ReverseProvider[] = [
  {
    name: 'nominatim',
    url: (lat, lon) =>
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&format=json&accept-language=en`,
    headers: { 'User-Agent': NOMINATIM_USER_AGENT },
    parse: (d) => {
      const address = d.address as Record<string, unknown> | undefined;
      if (!address || typeof address !== 'object') return null;
      const rawState = asNullableString(address.state) ?? asNullableString(address.state_district);
      const rawRegion = asNullableString(address.region) ?? asNullableString(address.county);
      const rawCountry = asNullableString(address.country);

      const candidateCity =
        asNullableString(address.city) ??
        asNullableString(address.town) ??
        asNullableString(address.municipality) ??
        asNullableString(address.village) ??
        asNullableString(address.suburb) ??
        asNullableString(address.county) ??
        rawState;

      const loc = resolveCityAndRegion(candidateCity, rawState, rawRegion, rawCountry);
      if (!loc) return null;

      const region = rawState ?? loc.region;
      return {
        city: loc.city,
        region,
        country: loc.country,
        formattedAddress:
          asNullableString(d.display_name) ??
          formatAddressParts(loc.city, region, loc.country) ??
          loc.city,
      };
    },
  },
  {
    name: 'bigdatacloud',
    url: (lat, lon) =>
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lon))}&localityLanguage=en`,
    parse: (d) => {
      const rawState = asNullableString(d.principalSubdivision);
      const rawLocality = asNullableString(d.locality);
      const rawCountry = asNullableString(d.countryName);
      const candidateCity = asNullableString(d.city) ?? rawLocality ?? rawState;

      const loc = resolveCityAndRegion(candidateCity, rawState, rawLocality, rawCountry);
      if (!loc) return null;

      const region = rawState ?? loc.region;
      return {
        city: loc.city,
        region,
        country: loc.country,
        formattedAddress: formatAddressParts(loc.city, region, loc.country) ?? loc.city,
      };
    },
  },
];

export type GeolocationServiceDeps = {
  fetchFn?: typeof globalThis.fetch;
  ipTimeoutMs?: number;
  reverseTimeoutMs?: number;
};

async function fetchJson(
  fetchFn: typeof globalThis.fetch,
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers,
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Server-side IP geolocation + reverse-geocode proxy.
 * Browsers must not call upstream providers directly (CORS / Permissions-Policy).
 */
export class GeolocationService {
  private fetchFn: typeof globalThis.fetch;
  private ipTimeoutMs: number;
  private reverseTimeoutMs: number;

  constructor(deps: GeolocationServiceDeps = {}) {
    this.fetchFn = deps.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.ipTimeoutMs = deps.ipTimeoutMs ?? IP_GEOLOCATION_TIMEOUT_MS;
    this.reverseTimeoutMs = deps.reverseTimeoutMs ?? REVERSE_GEOCODE_TIMEOUT_MS;
  }

  async getIpGeolocation(ip: string): Promise<IpGeolocationResult> {
    try {
      for (const provider of IP_PROVIDERS) {
        try {
          const data = await fetchJson(this.fetchFn, provider.url(ip), this.ipTimeoutMs);
          if (!data) continue;
          const result = provider.parse(data);
          if (!result) continue;
          return {
            success: true,
            provider: provider.name,
            latitude: result.lat,
            longitude: result.lon,
            city: result.city,
            region: result.region,
            country: result.country,
            formattedAddress: formatAddressParts(result.city, result.region, result.country),
          };
        } catch {
          // Provider timed out / network error — try next.
        }
      }

      return {
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
      };
    } catch (err) {
      throw err;
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    try {
      for (const provider of REVERSE_PROVIDERS) {
        try {
          const data = await fetchJson(
            this.fetchFn,
            provider.url(lat, lon),
            this.reverseTimeoutMs,
            provider.headers,
          );
          if (!data) continue;
          const result = provider.parse(data);
          if (!result) continue;
          return {
            success: true,
            provider: provider.name,
            city: result.city,
            region: result.region,
            country: result.country,
            formattedAddress: result.formattedAddress,
          };
        } catch {
          // Provider timed out / network error — try next.
        }
      }

      return {
        success: false,
        provider: null,
        city: 'Unknown Location',
        region: null,
        country: null,
        formattedAddress: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        error: 'Reverse geocoding failed',
      };
    } catch (err) {
      throw err;
    }
  }
}
