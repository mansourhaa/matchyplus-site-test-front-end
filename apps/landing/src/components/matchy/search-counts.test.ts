import { describe, expect, it } from 'vitest';

import { CITIES, SERVICES, countWords, findCity, findService, getProCount } from './search-counts';

describe('search counts (temporary sample numbers until the API)', () => {
  it('recognises services and cities despite typos, accents and case', () => {
    expect(findService('pombire')?.code).toBe('PLB');
    expect(findService('ELECTRICIEN')?.code).toBe('ELC');
    expect(findService('électricien')?.code).toBe('ELC');
    expect(findService('Plumber')?.code).toBe('PLB');
    expect(findService('سبّاك')?.code).toBe('PLB');
    expect(findCity('souse')?.id).toBe('sousse');
    expect(findCity('GABES')?.id).toBe('gabes');
    expect(findCity('سوسة')?.id).toBe('sousse');
  });

  it('does not guess: unknown or too different words give no count', () => {
    expect(findService('astronaute')).toBeUndefined();
    expect(findCity('Paris')).toBeUndefined();
    expect(getProCount('', 'Sousse')).toBeNull();
    expect(getProCount('Plombier', '')).toBeNull();
  });

  it('Plombier in Sousse is 35, the figure the team gave', () => {
    expect(getProCount('Plombier', 'Sousse')).toEqual({
      service: 'PLB',
      city: 'sousse',
      count: 35,
    });
  });

  it('every count is between 30 and 50 and stays the same for the same search', () => {
    for (const service of SERVICES) {
      for (const city of CITIES) {
        const first = getProCount(service.words[0], city.name.fr);
        expect(first?.count).toBeGreaterThanOrEqual(30);
        expect(first?.count).toBeLessThanOrEqual(50);
        expect(getProCount(service.words[0], city.name.fr)).toEqual(first);
      }
    }
  });

  it('gives the plural trade and the city name in each language', () => {
    const count = getProCount('Plombier', 'Sousse')!;
    expect(countWords(count, 'fr')).toEqual({ service: 'plombiers', city: 'Sousse' });
    expect(countWords(count, 'en')).toEqual({ service: 'plumbers', city: 'Sousse' });
    expect(countWords(count, 'ar')).toEqual({ service: 'سبّاكًا', city: 'سوسة' });
  });
});
