import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Capacitor / native platform helpers for the member app.
 */

interface MobileClientPlugin {
  getClientKey(): Promise<{ key: string }>;
}

const MobileClient = registerPlugin<MobileClientPlugin>('MobileClient');

export function isNativeMobileClient(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Header value for `X-Matchy-Client`. */
export const MATCHY_MOBILE_CLIENT_HEADER = 'mobile';

/** Header name for the Cap build secret (`MOBILE_CLIENT_SECRET`). */
export const MATCHY_MOBILE_KEY_HEADER = 'X-Matchy-Mobile-Key';

/** `undefined` = not fetched yet; string = cached key; never cache hard failures. */
let cachedMobileKey: string | undefined;

/**
 * Native-only shared secret from BuildConfig via MobileClient plugin.
 * Empty in browsers (plugin unavailable) — API then refuses body JWTs.
 * Plugin throws / bridge misses are not cached so the next call can retry.
 */
export async function getMobileClientKey(): Promise<string | null> {
  if (!isNativeMobileClient()) return null;
  if (cachedMobileKey !== undefined) return cachedMobileKey;
  try {
    const { key } = await MobileClient.getClientKey();
    const trimmed = key?.trim() ?? '';
    // Empty string means the build has no secret configured — cache that so we
    // do not hammer the bridge every request. Real bridge failures throw below.
    cachedMobileKey = trimmed;
    return trimmed || null;
  } catch {
    return null;
  }
}

/** Drop a cached key (e.g. after logout) so the next Cap session re-reads BuildConfig. */
export function clearMobileClientKeyCache() {
  cachedMobileKey = undefined;
}

/** Headers Cap must attach for authorized mobile auth (client label + secret). */
export async function getMobileAuthHeaders(): Promise<Record<string, string>> {
  if (!isNativeMobileClient()) return {};
  const key = await getMobileClientKey();
  const headers: Record<string, string> = {
    'X-Matchy-Client': MATCHY_MOBILE_CLIENT_HEADER,
  };
  if (key) {
    headers[MATCHY_MOBILE_KEY_HEADER] = key;
  }
  return headers;
}
