import { SUPPORTED_LOCALES, getMessage, messages } from '@/features/i18n/messages';
import { describe, expect, it } from 'vitest';

import {
  COUNTRY_POINTS,
  HUB_ID,
  SEARCH_CONSOLE,
  arcPath,
  numberLocale,
  toCountryNames,
  tooltipPlacement,
} from './community-map';

describe('community map data', () => {
  it('holds the Search Console figures: the listed countries fit within the totals', () => {
    const listed = COUNTRY_POINTS.reduce((total, point) => total + point.impressions, 0);
    expect(listed).toBeLessThanOrEqual(SEARCH_CONSOLE.impressions);
    expect(COUNTRY_POINTS.length).toBeLessThanOrEqual(SEARCH_CONSOLE.countries);
    expect(SEARCH_CONSOLE.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('keeps every country on the map', () => {
    for (const { x, y } of COUNTRY_POINTS) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(100);
    }
  });

  it('draws a curve from one city to another, bowing upwards', () => {
    expect(arcPath({ x: 0, y: 50 }, { x: 10, y: 50 })).toBe('M0 226 Q50 196 100 226');
    expect(COUNTRY_POINTS.some(({ id }) => id === HUB_ID)).toBe(true);
  });

  it('opens the tooltip towards the inside of the map', () => {
    expect(tooltipPlacement(10, 50)).toEqual({ align: 'start', below: false });
    expect(tooltipPlacement(50, 50)).toEqual({ align: 'center', below: false });
    expect(tooltipPlacement(90, 82)).toEqual({ align: 'end', below: false });
    expect(tooltipPlacement(50, 20)).toEqual({ align: 'center', below: true });
  });

  it('formats numbers per language, with Latin digits in Arabic', () => {
    expect(new Intl.NumberFormat(numberLocale('ar')).format(1240)).toMatch(/^1\D?240$/);
    expect(new Intl.NumberFormat(numberLocale('en')).format(1240)).toBe('1,240');
  });

  it.each(SUPPORTED_LOCALES)('%s names every city on the map', (locale) => {
    const names = toCountryNames(getMessage(messages[locale], 'landing.communityCountries'));
    for (const { id } of COUNTRY_POINTS) expect(names[id]).toBeTruthy();
  });
});
