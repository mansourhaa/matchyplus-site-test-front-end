import { describe, expect, it } from 'vitest';

import { localizePath, negotiateLocale, splitLocale, switchLocalePath } from './routing';

describe('localizePath', () => {
  it('prefixes the locale and ends on the trailing slash pages are served on', () => {
    expect(localizePath('fr', '/')).toBe('/fr/');
    expect(localizePath('en', '/faq')).toBe('/en/faq/');
    expect(localizePath('ar', '/faq/')).toBe('/ar/faq/');
  });

  it('keeps an in-page anchor after the slash', () => {
    expect(localizePath('fr', '/#how')).toBe('/fr/#how');
  });
});

describe('splitLocale', () => {
  it('reads the locale prefix and the rest of the path', () => {
    expect(splitLocale('/en/faq/')).toEqual({ locale: 'en', path: '/faq' });
    expect(splitLocale('/ar/')).toEqual({ locale: 'ar', path: '/' });
    expect(splitLocale('/fr')).toEqual({ locale: 'fr', path: '/' });
  });

  it('returns no locale for locale-less or unsupported prefixes', () => {
    expect(splitLocale('/faq')).toEqual({ locale: null, path: '/faq' });
    expect(splitLocale('/de/faq/')).toEqual({ locale: null, path: '/de/faq/' });
    expect(splitLocale('/fresh/')).toEqual({ locale: null, path: '/fresh/' });
  });
});

describe('switchLocalePath', () => {
  it('points at the same page in the other language', () => {
    expect(switchLocalePath('/fr/devenir-partenaire/', 'ar')).toBe('/ar/devenir-partenaire/');
    expect(switchLocalePath('/en/', 'fr')).toBe('/fr/');
  });
});

describe('negotiateLocale', () => {
  it('picks the best supported language by q-value', () => {
    expect(negotiateLocale('de-DE,ar;q=0.8,en;q=0.9')).toBe('en');
    expect(negotiateLocale('ar-TN,ar;q=0.9,fr;q=0.8')).toBe('ar');
  });

  it('returns null when nothing usable is offered', () => {
    expect(negotiateLocale(null)).toBeNull();
    expect(negotiateLocale('de-DE,es;q=0.5')).toBeNull();
    expect(negotiateLocale('en;q=0')).toBeNull();
  });
});
