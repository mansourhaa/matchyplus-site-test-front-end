/**
 * Pure IP helpers for geolocation proxy routes.
 * No I/O — validation and URL-safe encoding only.
 */

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

/** Compressed / full IPv6 (including IPv4-mapped). */
const IPV6_RE =
  /^(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:|(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}|(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}|(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}|(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}|[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}|:(?::[0-9a-f]{1,4}){1,7}|::|(?:[0-9a-f]{1,4}:){1,6}:\d{1,3}(?:\.\d{1,3}){3}|::(?:ffff(?::0{1,4})?:)?\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Returns a trimmed IP when it is a valid IPv4 or IPv6 literal, otherwise null.
 * Rejects empty strings, hostnames, and URLs (SSRF-adjacent misuse of the proxy).
 */
export function parseIpAddress(value: string | undefined | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Strip optional zone id (fe80::1%eth0) and brackets ([::1]).
  const withoutZone = trimmed.split('%')[0] ?? trimmed;
  const candidate =
    withoutZone.startsWith('[') && withoutZone.endsWith(']')
      ? withoutZone.slice(1, -1)
      : withoutZone;

  if (IPV4_RE.test(candidate) || IPV6_RE.test(candidate)) {
    return candidate;
  }
  return null;
}

/** Encode an IP for use in a URL path segment (IPv6-safe). */
export function encodeIpForPath(ip: string): string {
  return encodeURIComponent(ip);
}
