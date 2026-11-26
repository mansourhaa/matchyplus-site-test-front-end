import { describe, expect, it } from 'vitest';

import { APP_LOGIN_URL, APP_REGISTER_URL, appLink } from './constants';

describe('appLink', () => {
  it('adds the visitor language, so the app opens in it', () => {
    expect(appLink(APP_LOGIN_URL, 'ar')).toBe(`${APP_LOGIN_URL}?lang=ar`);
    expect(appLink(APP_REGISTER_URL, 'fr')).toBe(`${APP_REGISTER_URL}?lang=fr`);
  });

  it('keeps the other query parameters and replaces an older lang', () => {
    expect(appLink(`${APP_REGISTER_URL}?ref=MP-1&lang=en`, 'ar')).toBe(
      `${APP_REGISTER_URL}?ref=MP-1&lang=ar`,
    );
  });
});

describe('API_URL', () => {
  it('uses the versioned base like the other apps, and adds /v1 to a base without it', async () => {
    const { apiBase } = await import('./constants');
    expect(apiBase('https://api.matchyplus.com/api/v1')).toBe('https://api.matchyplus.com/api/v1');
    expect(apiBase('https://api.matchyplus.com/api/v1/')).toBe('https://api.matchyplus.com/api/v1');
    expect(apiBase('http://localhost:8000/api')).toBe('http://localhost:8000/api/v1');
  });
});
