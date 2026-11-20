import { describe, expect, it } from 'vitest';

import { buildSearchUrl, sampleResultCount, withSearch } from './search-results-data';

describe('buildSearchUrl', () => {
  it('carries the trimmed service and city', () => {
    expect(buildSearchUrl('https://app.matchyplus.com/register', ' Plombier ', 'Sfax')).toBe(
      'https://app.matchyplus.com/register?service=Plombier&ville=Sfax',
    );
  });

  it('leaves empty fields out', () => {
    expect(buildSearchUrl('https://app.matchyplus.com/register', '', '  ')).toBe(
      'https://app.matchyplus.com/register',
    );
  });
});

describe('withSearch', () => {
  it('adds the trimmed, encoded search to a site path', () => {
    expect(withSearch('/fr/recherche/', ' Garde d’enfants ', 'La Marsa')).toBe(
      '/fr/recherche/?service=Garde+d%E2%80%99enfants&ville=La+Marsa',
    );
  });

  it('keeps the bare path without a search', () => {
    expect(withSearch('/ar/recherche/', ' ', '')).toBe('/ar/recherche/');
  });
});

describe('sampleResultCount', () => {
  it('stays between 12 and 48', () => {
    for (const [service, city] of [
      ['', ''],
      ['Plombier', 'Tunis'],
      ['Électricien', 'Sfax'],
      ['سبّاك', 'تونس'],
      ['x'.repeat(200), 'y'],
    ]) {
      const count = sampleResultCount(service, city);
      expect(count).toBeGreaterThanOrEqual(12);
      expect(count).toBeLessThanOrEqual(48);
    }
  });

  it('gives the same number for the same search, whatever the case or spaces', () => {
    expect(sampleResultCount(' Plombier ', 'TUNIS')).toBe(sampleResultCount('plombier', 'tunis'));
  });
});
