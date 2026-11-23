/**
 * Data of the ambition map: real Google Search Console figures (web search, last 3 months, read
 * on 23 Nov 2026). To update: open Search Console > Performances > Pays, then change
 * SEARCH_CONSOLE and the impressions below. Only aggregated figures: never visitor data.
 */

/** public/matchy/community/world-map-v2.svg: width / height of its viewBox. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 452;

/** Search Console totals shown as the map's counters, with their source line. */
export const SEARCH_CONSOLE = {
  /** Countries where Matchy+ appeared in Google results. */
  countries: 52,
  /** Times Matchy+ appeared in Google results (impressions). */
  impressions: 434,
  /** Day the figures were read, YYYY-MM-DD. */
  asOf: '2026-11-23',
} as const;

/** The countries of Search Console's first page (ISO 3166 alpha-2), highlighted on the map. */
export type CountryId = 'TN' | 'US' | 'FR' | 'MA' | 'ZA' | 'BR' | 'NG' | 'DE' | 'TR' | 'BG';

export type CommunityLocation = {
  id: CountryId;
  /** Position on the map, in % of its width and height. */
  x: number;
  y: number;
  /** Times Matchy+ appeared in Google results from this country (Search Console). */
  impressions: number;
};

/**
 * x / y: the country's centre in the same projection as the map (d3-geo geoNaturalEarth1, fitted
 * to a width of 1000 on world-atlas countries-110m, Natural Earth, public domain, without
 * Antarctica). If the map is regenerated, recompute them with the same projection.
 */
export const COUNTRY_POINTS: readonly CommunityLocation[] = [
  { id: 'TN', x: 52.5, y: 33.5, impressions: 136 },
  { id: 'US', x: 22.6, y: 26.4, impressions: 54 },
  { id: 'FR', x: 50.6, y: 24.7, impressions: 41 },
  { id: 'MA', x: 47.7, y: 36.7, impressions: 37 },
  { id: 'ZA', x: 56.8, y: 79.1, impressions: 23 },
  { id: 'BR', x: 35.2, y: 65.9, impressions: 14 },
  { id: 'NG', x: 52.2, y: 51.3, impressions: 10 },
  { id: 'DE', x: 52.5, y: 21.5, impressions: 5 },
  { id: 'TR', x: 59.1, y: 30.0, impressions: 2 },
  { id: 'BG', x: 56.5, y: 27.3, impressions: 1 },
];

/** Matchy+ was born in Tunisia: the map's lines start there. */
export const HUB_ID: CountryId = 'TN';

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

/** Rows of `landing.communityCountries`: [countryId, translated name]. */
export function toCountryNames(rows: unknown): Partial<Record<CountryId, string>> {
  if (!Array.isArray(rows)) return {};
  return Object.fromEntries(
    rows.filter((row): row is [CountryId, string] => Array.isArray(row) && row.length === 2),
  );
}

/** Number format per site language (Latin digits in Arabic too, like the rest of the site). */
export function numberLocale(locale: string): string {
  return locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR';
}
