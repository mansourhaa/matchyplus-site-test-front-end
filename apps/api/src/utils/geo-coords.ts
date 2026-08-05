/**
 * Pure coordinate parsing for geolocation providers / reverse-geocode input.
 */

export type LatLon = { lat: number; lon: number };

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Parse latitude/longitude without truthy checks so equator (0) / prime meridian (0) work.
 * Returns null when either value is missing, non-finite, or out of range.
 */
export function parseLatLon(lat: unknown, lon: unknown): LatLon | null {
  const latitude = asFiniteNumber(lat);
  const longitude = asFiniteNumber(lon);
  if (latitude == null || longitude == null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { lat: latitude, lon: longitude };
}

export function formatAddressParts(
  city: string | null | undefined,
  region: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const parts = [city, region, country].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}
