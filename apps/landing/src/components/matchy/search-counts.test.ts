import { describe, expect, it, vi } from 'vitest';

import { countWords, fetchProCount, findCity, findService, proCountRequest } from './search-counts';

describe('search counts (from the API)', () => {
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

  it('does not guess: unknown or too different words give no request', () => {
    expect(findService('astronaute')).toBeUndefined();
    expect(findCity('Paris')).toBeUndefined();
    expect(proCountRequest('', 'Sousse')).toBeNull();
    expect(proCountRequest('Plombier', '')).toBeNull();
  });

  it('asks the API with the French names, whatever was typed', () => {
    const request = proCountRequest('pombire', 'سوسة');
    expect(request?.url).toMatch(/\/api\/v1\/pros\/count\?service=Plombier&city=Sousse$/);
    expect(request?.url).not.toContain('/v1/v1/');
  });

  it('returns the API count', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ service: 'Plombier', city: 'Sousse', count: 35 })),
      );
    await expect(fetchProCount('Plombier', 'Sousse', fetcher)).resolves.toEqual({
      service: 'PLB',
      city: 'sousse',
      count: 35,
    });
  });

  it('no number when nobody matches, the API fails, or the search is unknown', async () => {
    const zero = vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 0 })));
    const down = vi.fn().mockRejectedValue(new Error('network'));
    const error = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }));
    const unused = vi.fn();
    await expect(fetchProCount('Plombier', 'Sousse', zero)).resolves.toBeNull();
    await expect(fetchProCount('Plombier', 'Sousse', down)).resolves.toBeNull();
    await expect(fetchProCount('Plombier', 'Sousse', error)).resolves.toBeNull();
    await expect(fetchProCount('astronaute', 'Sousse', unused)).resolves.toBeNull();
    expect(unused).not.toHaveBeenCalled();
  });

  it('uses the right word form for every number, in each language', () => {
    const words = (n: number, locale: 'fr' | 'en' | 'ar') =>
      countWords({ service: 'PLB', city: 'sousse', count: n }, locale);
    expect(words(1, 'fr')).toEqual({ service: 'plombier', city: 'Sousse', singular: true });
    expect(words(35, 'fr')).toEqual({ service: 'plombiers', city: 'Sousse', singular: false });
    expect(words(1, 'en').service).toBe('plumber');
    expect(words(2, 'en').service).toBe('plumbers');
    // Arabic: 1, 2, 3–10, 11–99 and 100+ each have their own form
    expect(words(1, 'ar').service).toBe('سبّاك');
    expect(words(2, 'ar').service).toBe('سبّاكان');
    expect(words(5, 'ar').service).toBe('سبّاكين');
    expect(words(35, 'ar').service).toBe('سبّاكًا');
    expect(words(100, 'ar').service).toBe('سبّاك');
    expect(words(35, 'ar').city).toBe('سوسة');
  });
});
