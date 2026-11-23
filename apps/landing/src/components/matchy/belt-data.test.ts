import { SUPPORTED_LOCALES, getMessage, messages } from '@/features/i18n/messages';
import { describe, expect, it } from 'vitest';

import { SERVICE_IMAGES, personTag, toProfiles, toServices } from './belt-data';
import { swipeDirection } from './hero-live-phone';

describe('toProfiles', () => {
  it('reads a profile row and keeps the extra cells as tags', () => {
    const profiles = toProfiles([
      [
        'PLB',
        'Youssef B.',
        '27',
        '2,4',
        '4,8',
        '132',
        '88',
        '25',
        'Plombier.',
        'Urgent',
        'Sanitaire',
      ],
    ]);
    expect(profiles.PLB).toEqual({
      name: 'Youssef B.',
      age: '27',
      distanceKm: '2,4',
      rating: '4,8',
      reviews: '132',
      score: 88,
      price: '25',
      bio: 'Plombier.',
      tags: ['Urgent', 'Sanitaire'],
    });
  });

  it('ignores anything that is not a list of rows', () => {
    expect(toProfiles(undefined)).toEqual({});
    expect(toProfiles(['not a row'])).toEqual({});
  });
});

describe('toServices', () => {
  it('attaches the cut-out image and skips unknown codes', () => {
    const services = toServices([
      ['PLB', 'Plombier', 'Fuites', 'a', 'b'],
      ['XXX', 'Inconnu', '…'],
    ]);
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({
      code: 'PLB',
      items: ['a', 'b'],
      image: SERVICE_IMAGES.PLB,
    });
  });
});

describe('belt texts', () => {
  it.each(SUPPORTED_LOCALES)('%s: every belt service has a sample profile', (locale) => {
    const services = toServices(getMessage(messages[locale], 'landing.beltServices'));
    const profiles = toProfiles(getMessage(messages[locale], 'landing.beltProfiles'));
    expect(services.length).toBe(Object.keys(SERVICE_IMAGES).length);
    for (const service of services) expect(profiles[service.code]).toBeDefined();
  });
});

describe('swipeDirection', () => {
  it('shows pass and connect, with a connect in every cycle', () => {
    expect(swipeDirection(0)).toBe(0);
    const cycle = [1, 2, 3, 4, 5].map(swipeDirection);
    expect(cycle).toContain(-1);
    expect(cycle).toContain(1);
    expect(swipeDirection(6)).toBe(swipeDirection(1));
  });
});

describe('personTag', () => {
  it('shows the name and the price, or the trade without a profile', () => {
    const profiles = toProfiles([
      ['PLB', 'Youssef B.', '27', '2,4', '4,8', '132', '88', '25', 'Plombier.'],
    ]);
    expect(personTag(profiles.PLB, '25 à 30 DT/jour', 'Plombier')).toBe(
      'Youssef B. · 25 à 30 DT/jour',
    );
    expect(personTag(undefined, '', 'Plombier')).toBe('Plombier');
  });
});
