import { describe, expect, it } from 'vitest';

import { buildSearchUrl, withSearch } from './search-results-data';

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
