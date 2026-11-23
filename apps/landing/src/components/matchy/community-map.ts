/**
 * Data for the live community map. Sample figures for now, clearly labelled on screen.
 * To go live, replace CITY_POINTS / SAMPLE_AUDIENCE with aggregated numbers from the API
 * (city, approximate position, active visitors): never send visitor IPs to the browser.
 */

/** public/matchy/community/world-map.svg: width / height of its viewBox. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 452;

export type CityId =
  | 'tunis'
  | 'paris'
  | 'london'
  | 'newYork'
  | 'montreal'
  | 'dubai'
  | 'mumbai'
  | 'singapore'
  | 'sydney';

export type CommunityLocation = {
  id: CityId;
  /** Position on the map, in % of its width and height. */
  x: number;
  y: number;
};

/**
 * x / y come from the same projection as the map: d3-geo geoNaturalEarth1, fitted to a width
 * of 1000 on world-atlas countries-110m (Natural Earth, public domain), without Antarctica.
 * If the map is regenerated, recompute them with the same projection.
 */
export const CITY_POINTS: readonly CommunityLocation[] = [
  { id: 'tunis', x: 52.7, y: 31.6 },
  { id: 'paris', x: 50.6, y: 23.0 },
  { id: 'london', x: 50.0, y: 21.2 },
  { id: 'newYork', x: 30.9, y: 28.8 },
  { id: 'montreal', x: 31.4, y: 25.4 },
  { id: 'dubai', x: 65.1, y: 40.0 },
  { id: 'mumbai', x: 70.1, y: 44.5 },
  { id: 'singapore', x: 79.2, y: 57.2 },
  { id: 'sydney', x: 90.2, y: 82.7 },
];

/** Matchy+ was born in Tunis: the map's lines start there. */
export const HUB_ID: CityId = 'tunis';

/**
 * Curved line between two map points (in %), as an SVG path in map units (MAP_WIDTH ×
 * MAP_HEIGHT). The curve bows upwards, more for longer distances, like a flight route.
 */
export function arcPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const x0 = (from.x / 100) * MAP_WIDTH;
  const y0 = (from.y / 100) * MAP_HEIGHT;
  const x1 = (to.x / 100) * MAP_WIDTH;
  const y1 = (to.y / 100) * MAP_HEIGHT;
  const lift = Math.hypot(x1 - x0, y1 - y0) * 0.3;
  const round = (value: number) => Math.round(value * 10) / 10;
  return `M${round(x0)} ${round(y0)} Q${round((x0 + x1) / 2)} ${round((y0 + y1) / 2 - lift)} ${round(x1)} ${round(y1)}`;
}

/** Where the tooltip opens, so it never leaves the map near its edges. */
export function tooltipPlacement(x: number, y: number) {
  return {
    align: x < 22 ? 'start' : x > 78 ? 'end' : 'center',
    below: y < 34,
  } as const;
}

/** Rows of `landing.communityCities`: [cityId, translated name]. */
export function toCityNames(rows: unknown): Partial<Record<CityId, string>> {
  if (!Array.isArray(rows)) return {};
  return Object.fromEntries(
    rows.filter((row): row is [CityId, string] => Array.isArray(row) && row.length === 2),
  );
}

/** Number format per site language (Latin digits in Arabic too, like the rest of the site). */
export function numberLocale(locale: string): string {
  return locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR';
}
