import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy } from './proxy';

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, 'https://matchyplus.com'), {
    headers: new Headers(headers),
  });
}

function location(res: Response): string {
  const url = new URL(res.headers.get('location') ?? '');
  return url.pathname + url.search;
}

describe('proxy locale routing', () => {
  it('lets localized URLs through untouched', () => {
    for (const path of ['/fr/', '/en/faq/', '/ar/contact/']) {
      const res = proxy(request(path));
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('sends visitors with no preference to the French default, temporarily', () => {
    const res = proxy(request('/'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('/fr/');
    expect(res.headers.get('vary')).toBe('Accept-Language, Cookie');
  });

  it('follows the browser language, then the remembered choice over it', () => {
    expect(location(proxy(request('/faq/', { 'accept-language': 'ar-TN,ar;q=0.9' })))).toBe(
      '/ar/faq/',
    );
    const remembered = proxy(
      request('/faq/', { 'accept-language': 'ar', cookie: 'matchy_locale=en' }),
    );
    expect(location(remembered)).toBe('/en/faq/');
  });

  it('maps member-app `?lang=` links permanently and drops the parameter', () => {
    const res = proxy(request('/privacy-policy/?lang=en&utm_source=app'));
    expect(res.status).toBe(308);
    expect(location(res)).toBe('/en/privacy-policy/?utm_source=app');
  });

  it('ignores an unsupported `?lang=` value', () => {
    const res = proxy(request('/?lang=de'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('/fr/');
  });
});
