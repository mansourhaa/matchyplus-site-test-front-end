/**
 * Capacitor / native platform helpers for the member app.
 * Detection mirrors Matchy-FullStack: Capacitor.isNativePlatform().
 */

export function isNativeMobileClient(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** Header value for `X-Matchy-Client` — API returns body tokens when this is set. */
export const MATCHY_MOBILE_CLIENT_HEADER = 'mobile';
