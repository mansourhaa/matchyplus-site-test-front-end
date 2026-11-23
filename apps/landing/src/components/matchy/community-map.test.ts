import { SUPPORTED_LOCALES, getMessage, messages } from '@/features/i18n/messages';
import { describe, expect, it } from 'vitest';

import {
  CITY_POINTS,
  HUB_ID,
  arcPath,
  numberLocale,
  toCityNames,
  tooltipPlacement,
} from './community-map';

describe('community map data', () => {
  it('keeps every city on the map', () => {
    for (const { x, y } of CITY_POINTS) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(100);
    }
  });

  it('draws a curve from one city to another, bowing upwards', () => {
    expect(arcPath({ x: 0, y: 50 }, { x: 10, y: 50 })).toBe('M0 226 Q50 196 100 226');
    expect(CITY_POINTS.some(({ id }) => id === HUB_ID)).toBe(true);
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
    const cities = toCityNames(getMessage(messages[locale], 'landing.communityCities'));
    for (const { id } of CITY_POINTS) expect(cities[id]).toBeTruthy();
  });
});
