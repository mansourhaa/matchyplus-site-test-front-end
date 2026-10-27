import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_DISCOVER_FILTERS,
  DISCOVER_FILTERS_STORAGE_KEY,
  DISTANCE_PRESETS,
  DISTANCE_RADIUS_STORAGE_KEY,
  MAX_DISTANCE_KM,
  clearStoredDistanceRadius,
  isCustomDistanceRadius,
  readStoredDiscoverFilters,
  readStoredDistanceRadius,
  storeDiscoverFilters,
  storeDistanceRadius,
} from './distance-filter';

describe('distance-filter utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('MAX_DISTANCE_KM', () => {
    it('is set to 250 km based on DISCOVERY_RADIUS_M default/env', () => {
      expect(MAX_DISTANCE_KM).toBe(250);
    });
  });

  describe('DISTANCE_PRESETS', () => {
    it('contains presets in expected order up to MAX_DISTANCE_KM: Tout, 5, 10, 25, 50, 100, 250', () => {
      expect(DISTANCE_PRESETS).toEqual([null, 5, 10, 25, 50, 100, 250]);
    });
  });

  describe('readStoredDistanceRadius', () => {
    it('returns null when storage is empty', () => {
      expect(readStoredDistanceRadius()).toBeNull();
    });

    it('returns null when storage contains "Tout" or "all"', () => {
      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, 'Tout');
      expect(readStoredDistanceRadius()).toBeNull();

      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, 'all');
      expect(readStoredDistanceRadius()).toBeNull();
    });

    it('parses valid numeric integers from 1 to MAX_DISTANCE_KM', () => {
      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, '1');
      expect(readStoredDistanceRadius()).toBe(1);

      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, '10');
      expect(readStoredDistanceRadius()).toBe(10);

      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, '15');
      expect(readStoredDistanceRadius()).toBe(15);

      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, '100');
      expect(readStoredDistanceRadius()).toBe(100);

      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, '250');
      expect(readStoredDistanceRadius()).toBe(250);
    });

    it('rejects out-of-range integers and malformed values safely', () => {
      const invalidValues = [
        '0',
        '-5',
        '251',
        '10.5',
        'abc',
        'NaN',
        '{"radius": 15}',
        '',
        '   ',
        'Infinity',
      ];

      for (const val of invalidValues) {
        window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, val);
        expect(readStoredDistanceRadius()).toBeNull();
      }
    });

    it('handles localStorage errors gracefully without throwing', () => {
      const originalGetItem = window.localStorage.getItem;
      window.localStorage.getItem = () => {
        throw new Error('Access denied in private mode');
      };

      expect(() => readStoredDistanceRadius()).not.toThrow();
      expect(readStoredDistanceRadius()).toBeNull();

      window.localStorage.getItem = originalGetItem;
    });
  });

  describe('storeDistanceRadius', () => {
    it('stores "Tout" when given null', () => {
      storeDistanceRadius(null);
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBe('Tout');
    });

    it('stores string representation of integer radius', () => {
      storeDistanceRadius(10);
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBe('10');

      storeDistanceRadius(25);
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBe('25');

      storeDistanceRadius(1);
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBe('1');

      storeDistanceRadius(250);
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBe('250');
    });

    it('does not write invalid numbers', () => {
      storeDistanceRadius(300);
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBeNull();

      storeDistanceRadius(-1);
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBeNull();
    });

    it('handles localStorage setItem errors gracefully', () => {
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = () => {
        throw new Error('Quota exceeded');
      };

      expect(() => storeDistanceRadius(15)).not.toThrow();

      window.localStorage.setItem = originalSetItem;
    });
  });

  describe('clearStoredDistanceRadius', () => {
    it('removes the storage key', () => {
      window.localStorage.setItem(DISTANCE_RADIUS_STORAGE_KEY, '25');
      clearStoredDistanceRadius();
      expect(window.localStorage.getItem(DISTANCE_RADIUS_STORAGE_KEY)).toBeNull();
    });
  });

  describe('isCustomDistanceRadius', () => {
    it('returns false for null (Tout)', () => {
      expect(isCustomDistanceRadius(null)).toBe(false);
    });

    it('returns false for predefined presets (5, 10, 25, 50, 100, 250)', () => {
      expect(isCustomDistanceRadius(5)).toBe(false);
      expect(isCustomDistanceRadius(10)).toBe(false);
      expect(isCustomDistanceRadius(25)).toBe(false);
      expect(isCustomDistanceRadius(50)).toBe(false);
      expect(isCustomDistanceRadius(100)).toBe(false);
      expect(isCustomDistanceRadius(250)).toBe(false);
    });

    it('returns true for custom values (e.g. 1, 15, 30, 75, 180)', () => {
      expect(isCustomDistanceRadius(1)).toBe(true);
      expect(isCustomDistanceRadius(15)).toBe(true);
      expect(isCustomDistanceRadius(30)).toBe(true);
      expect(isCustomDistanceRadius(75)).toBe(true);
      expect(isCustomDistanceRadius(180)).toBe(true);
    });
  });

  describe('readStoredDiscoverFilters & storeDiscoverFilters', () => {
    it('returns default filters when storage is empty', () => {
      expect(readStoredDiscoverFilters()).toEqual(DEFAULT_DISCOVER_FILTERS);
    });

    it('persists and restores distanceKm filter', () => {
      storeDiscoverFilters({ distanceKm: 45 });
      expect(readStoredDiscoverFilters()).toEqual({ distanceKm: 45 });
    });

    it('handles corrupted JSON in storage gracefully', () => {
      window.localStorage.setItem(DISCOVER_FILTERS_STORAGE_KEY, 'invalid json');
      expect(readStoredDiscoverFilters()).toEqual(DEFAULT_DISCOVER_FILTERS);
    });
  });
});
