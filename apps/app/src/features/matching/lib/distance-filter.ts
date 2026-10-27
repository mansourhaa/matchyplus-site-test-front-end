export const DISTANCE_RADIUS_STORAGE_KEY = 'matchy_feed_distance_radius';

export const MIN_DISTANCE_KM = 1;

/**
 * Maximum discovery radius in kilometers derived from DISCOVERY_RADIUS_M env (default: 250 km).
 */
export const MAX_DISTANCE_KM: number = (() => {
  const envM =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_DISCOVERY_RADIUS_M || process.env.DISCOVERY_RADIUS_M
      : undefined;
  if (envM && /^\d+$/.test(envM)) {
    const km = Math.round(Number(envM) / 1000);
    if (km >= 1) return km;
  }
  const envKm =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_DISCOVERY_RADIUS_KM : undefined;
  if (envKm && /^\d+$/.test(envKm)) {
    const km = Number(envKm);
    if (km >= 1) return km;
  }
  return 250;
})();

export const NUMERIC_DISTANCE_PRESETS = [5, 10, 25, 50, 100, MAX_DISTANCE_KM].filter(
  (v, idx, arr) => arr.indexOf(v) === idx,
) as unknown as readonly number[];

export const DISTANCE_PRESETS = [null, ...NUMERIC_DISTANCE_PRESETS] as unknown as readonly (
  number | null
)[];
export type DistancePreset = (typeof DISTANCE_PRESETS)[number];

/**
 * Safely reads and validates the persisted distance radius from localStorage.
 * Accepts 'Tout' (which maps to null) or integers from 1 to MAX_DISTANCE_KM only.
 * Returns null for missing, malformed, or invalid entries.
 */
export function readStoredDistanceRadius(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed === 'Tout' || trimmed === 'all') return null;

    // Strict integer check
    if (!/^\d+$/.test(trimmed)) return null;
    const num = Number.parseInt(trimmed, 10);
    if (Number.isInteger(num) && num >= MIN_DISTANCE_KM && num <= MAX_DISTANCE_KM) {
      return num;
    }
  } catch {
    // Inaccessible localStorage (e.g. private browsing, sandbox)
  }
  return null;
}

/**
 * Safely persists the distance radius to localStorage.
 * When radius is null, persists 'Tout'.
 * When radius is a valid integer between 1 and MAX_DISTANCE_KM, persists String(radius).
 */
export function storeDistanceRadius(radius: number | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (radius === null) {
      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, 'Tout');
    } else if (Number.isInteger(radius) && radius >= MIN_DISTANCE_KM && radius <= MAX_DISTANCE_KM) {
      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, String(radius));
    }
  } catch {
    // Inaccessible localStorage
  }
}

/**
 * Removes the stored distance radius key from localStorage.
 */
export function clearStoredDistanceRadius(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DISTANCE_RADIUS_STORAGE_KEY);
  } catch {
    // Inaccessible localStorage
  }
}

export const DISCOVER_FILTERS_STORAGE_KEY = 'matchy_discover_filters';

export type DiscoverFeedFilters = {
  distanceKm: number | null;
};

export const DEFAULT_DISCOVER_FILTERS: DiscoverFeedFilters = {
  distanceKm: null,
};

export function readStoredDiscoverFilters(): DiscoverFeedFilters {
  if (typeof window === 'undefined') return { ...DEFAULT_DISCOVER_FILTERS };
  try {
    const raw = window.localStorage.getItem(DISCOVER_FILTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DiscoverFeedFilters>;
      const distanceKm =
        typeof parsed.distanceKm === 'number' &&
        parsed.distanceKm >= MIN_DISTANCE_KM &&
        parsed.distanceKm <= MAX_DISTANCE_KM
          ? parsed.distanceKm
          : null;
      return { distanceKm };
    }
  } catch {
    // Inaccessible localStorage or corrupt JSON
  }

  // Fallback to reading legacy distance radius key if present
  const legacyDistance = readStoredDistanceRadius();
  return {
    ...DEFAULT_DISCOVER_FILTERS,
    distanceKm: legacyDistance,
  };
}

export function storeDiscoverFilters(filters: DiscoverFeedFilters): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISCOVER_FILTERS_STORAGE_KEY, JSON.stringify(filters));
    // Also keep legacy distance radius key synchronized
    storeDistanceRadius(filters.distanceKm);
  } catch {
    // Inaccessible localStorage
  }
}

export function countActiveDiscoverFilters(
  filters: DiscoverFeedFilters,
  selectedSector?: string | null,
): number {
  let count = 0;
  if (selectedSector) count += 1;
  if (filters.distanceKm !== null && filters.distanceKm < MAX_DISTANCE_KM) count += 1;
  return count;
}

/**
 * Checks whether a given radius is a custom numeric radius (1-100 km)
 * that does not match one of the predefined numeric presets [5, 10, 25, 50, 100].
 */
export function isCustomDistanceRadius(radius: number | null): boolean {
  if (radius === null) return false;
  return !NUMERIC_DISTANCE_PRESETS.includes(radius as (typeof NUMERIC_DISTANCE_PRESETS)[number]);
}
