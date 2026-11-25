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
