import { describe, expect, it, vi } from 'vitest';

import { DiscoveryService, parseServiceTypes } from './discovery.js';

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'me',
    name: 'Me',
    image: null,
    bio: null,
    job: 'Dev',
    category: null,
    city: 'Tunis',
    interests: ['Mobile'],
    languages: ['fr', 'ar'],
    goals: [],
    looking_for: [],
    activity_sector: null,
    service_type: null,
    profile_type: 'INDIVIDUAL',
    gps_latitude: 36.8,
    gps_longitude: 10.18,
    rating: 4,
    status: 'ACTIVE',
    location: {
      latitude: 36.8,
      longitude: 10.18,
      location_enabled: true,
      city: 'Tunis',
      country: 'TN',
    },
    ...overrides,
  };
}

function candidate(
  id: string,
  overrides: Record<string, unknown> = {},
): ReturnType<typeof baseUser> {
  return baseUser({
    id,
    name: `User ${id}`,
    ...overrides,
  });
}

function createMockPrisma(candidates: ReturnType<typeof baseUser>[]) {
  return {
    user: {
      findUnique: vi
        .fn()
        .mockImplementation(({ where, select }: { where: { id: string }; select?: unknown }) => {
          if (where.id === 'me') {
            if (select && typeof select === 'object' && 'plan' in (select as object)) {
              return Promise.resolve({ plan: 'FREE' });
            }
            return Promise.resolve(baseUser());
          }
          return Promise.resolve(null);
        }),
      findMany: vi.fn().mockResolvedValue(candidates),
    },
    plan: {
      findUnique: vi.fn().mockResolvedValue({ profiles_per_category: 3 }),
    },
    userBlock: { findMany: vi.fn().mockResolvedValue([]) },
    match: { findMany: vi.fn().mockResolvedValue([]) },
    swipeLog: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    swipe: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('parseServiceTypes', () => {
  it('splits and normalizes a comma-separated list', () => {
    expect(parseServiceTypes(' Aide ménagère , Restauration / Service ')).toEqual([
      'aide ménagère',
      'restauration / service',
    ]);
  });

  it('returns empty for blank input', () => {
    expect(parseServiceTypes(undefined)).toEqual([]);
    expect(parseServiceTypes('  ')).toEqual([]);
  });
});

describe('DiscoveryService.getSwipeFeed filters + pagination', () => {
  it('filters by q against name and service type', async () => {
    const prisma = createMockPrisma([
      candidate('a', { name: 'Fatma', service_type: 'Aide ménagère' }),
      candidate('b', { name: 'Sami', service_type: 'Informatique / Tech' }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const result = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      q: 'sami',
      context: 'swipe',
    });

    expect(result.profiles.map((p) => p.id)).toEqual(['b']);
    expect(result.has_more).toBe(false);
  });

  // Regression: a phone signup gets a real User row (name defaulting to the phone
  // number itself) as soon as the OTP is verified, well before onboarding is
  // finished. Without this filter, anyone who abandons onboarding mid-way was still
  // swipeable by everyone else, showing up with their phone number as a name and no
  // photo.
  it('excludes candidates who never finished onboarding', async () => {
    const prisma = createMockPrisma([candidate('a')]);
    const service = new DiscoveryService({ prisma: prisma as never });

    await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      context: 'swipe',
    });

    const firstCall = prisma.user.findMany.mock.calls[0];
    const where = firstCall?.[0]?.where;
    expect(where).toMatchObject({ onboarding_completed_at: { not: null } });
  });

  it('excludes candidates without registered location', async () => {
    const prisma = createMockPrisma([
      candidate('with_loc', {
        location: {
          latitude: 36.805,
          longitude: 10.185,
          location_enabled: true,
          city: 'Tunis',
          country: 'TN',
        },
      }),
      candidate('no_loc', {
        location: null,
        gps_latitude: null,
        gps_longitude: null,
      }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const result = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      context: 'swipe',
    });

    expect(result.profiles.map((p) => p.id)).toEqual(['with_loc']);
  });

  it('excludes candidates with no shared languages', async () => {
    const prisma = createMockPrisma([
      candidate('shared_fr', {
        languages: ['fr', 'en'],
      }),
      candidate('no_shared', {
        languages: ['de', 'it'],
      }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const result = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      context: 'swipe',
    });

    expect(result.profiles.map((p) => p.id)).toEqual(['shared_fr']);
  });

  it('filters by serviceTypes and default 100km radius', async () => {
    const prisma = createMockPrisma([
      candidate('near', {
        service_type: 'Restauration / Service',
        location: {
          latitude: 36.805,
          longitude: 10.185,
          location_enabled: true,
          city: 'Tunis',
          country: 'TN',
        },
      }),
      candidate('far', {
        service_type: 'Restauration / Service',
        // ~100km south
        location: {
          latitude: 35.8,
          longitude: 10.18,
          location_enabled: true,
          city: 'Sousse',
          country: 'TN',
        },
      }),
      candidate('other', {
        service_type: 'Jardinage / Bricolage',
        location: {
          latitude: 36.805,
          longitude: 10.185,
          location_enabled: true,
          city: 'Tunis',
          country: 'TN',
        },
      }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const result = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      serviceTypes: 'Restauration / Service',
      context: 'swipe',
    });

    expect(result.profiles.map((p) => p.id)).toEqual(['near']);
  });

  it('respects maxDistanceKm query override', async () => {
    const prisma = createMockPrisma([
      // ~10km away
      candidate('near-10km', {
        location: {
          latitude: 36.89,
          longitude: 10.18,
          location_enabled: true,
          city: 'Ariana',
          country: 'TN',
        },
      }),
      // ~20km away
      candidate('mid-20km', {
        location: {
          latitude: 36.98,
          longitude: 10.18,
          location_enabled: true,
          city: 'Raoued',
          country: 'TN',
        },
      }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    // With 15km override, only near-10km should match
    const result15 = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      maxDistanceKm: 15,
      context: 'swipe',
    });
    expect(result15.profiles.map((p) => p.id)).toEqual(['near-10km']);

    // With 25km override, both should match
    const result25 = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      maxDistanceKm: 25,
      context: 'swipe',
    });
    expect(result25.profiles.map((p) => p.id)).toEqual(['near-10km', 'mid-20km']);
  });

  it('paginates with offset and reports has_more', async () => {
    const prisma = createMockPrisma([
      candidate('1', { rating: 5, name: 'A' }),
      candidate('2', { rating: 4, name: 'B' }),
      candidate('3', { rating: 3, name: 'C' }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const page1 = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      sort: 'rating',
      limit: 2,
      offset: 0,
      context: 'swipe',
    });
    expect(page1.profiles.map((p) => p.id)).toEqual(['1', '2']);
    expect(page1.has_more).toBe(true);
    expect(page1.offset).toBe(0);
    expect(page1.limit).toBe(2);

    const page2 = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      sort: 'rating',
      limit: 2,
      offset: 2,
      context: 'swipe',
    });
    expect(page2.profiles.map((p) => p.id)).toEqual(['3']);
    expect(page2.has_more).toBe(false);
  });

  it('locks search profiles using absolute index across pages', async () => {
    const prisma = createMockPrisma([
      candidate('1'),
      candidate('2'),
      candidate('3'),
      candidate('4'),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const page2 = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      sort: 'rating',
      limit: 2,
      offset: 2,
      context: 'search',
    });

    // visibleLimit=3 → absolute indices 2 unlocked, 3 locked
    expect(page2.profiles[0]?.is_locked).toBe(false);
    expect(page2.profiles[1]?.is_locked).toBe(true);
    expect(page2.profiles[1]?.id).toBe('locked-3');
  });

  it('computes 6-dimension compatibility breakdown', async () => {
    const prisma = createMockPrisma([
      candidate('test_cand', {
        interests: ['Mobile', 'React'],
        languages: ['fr', 'ar', 'en'],
        availability_days: ['lun', 'mar', 'mer'],
        rating: 4.8,
        reviews: 12,
      }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const result = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      context: 'swipe',
    });

    expect(result.profiles).toHaveLength(1);
    const profile = result.profiles[0]!;
    expect(profile.compatibility).toHaveLength(6);
    expect(profile.compatibility.map((d) => d.dimension)).toEqual([
      'skills',
      'proximity',
      'goals',
      'availability',
      'languages',
      'quality',
    ]);
    expect(profile.match_score).toBeGreaterThanOrEqual(40);
    expect(profile.match_score).toBeLessThanOrEqual(100);
  });

  it('filters by sector, minPrice, maxPrice, and availableOnly', async () => {
    const prisma = createMockPrisma([
      candidate('1', {
        activity_sector: 'Services & missions',
        price: '20 DT',
        availability_days: ['Lun', 'Mar'],
      }),
      candidate('2', {
        activity_sector: 'Services & missions',
        price: '50 DT',
        availability_days: ['Mer'],
      }),
      candidate('3', {
        activity_sector: 'Informatique / Tech',
        price: '15 DT',
        availability_days: [],
      }),
      candidate('4', {
        activity_sector: 'Services & missions',
        price: '10 DT',
        availability_days: ['Jeu'],
      }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const result = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      sector: 'Services & missions',
      minPrice: 15,
      maxPrice: 30,
      availableOnly: true,
      context: 'swipe',
    });

    expect(result.profiles.map((p) => p.id)).toEqual(['1']);
  });

  it('sorts by price_asc and price_desc', async () => {
    const prisma = createMockPrisma([
      candidate('1', { price: '50 DT' }),
      candidate('2', { price: '20 DT' }),
      candidate('3', { price: '35 DT' }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    const ascResult = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      sort: 'price_asc',
      context: 'swipe',
    });
    expect(ascResult.profiles.map((p) => p.id)).toEqual(['2', '3', '1']);

    const descResult = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      sort: 'price_desc',
      context: 'swipe',
    });
    expect(descResult.profiles.map((p) => p.id)).toEqual(['1', '3', '2']);
  });

  it('filters by multiple sectors and interests', async () => {
    const prisma = createMockPrisma([
      candidate('1', {
        activity_sector: 'Informatique / Tech',
        interests: ['Informatique', 'Graphisme'],
      }),
      candidate('2', {
        activity_sector: 'BTP / Artisanat',
        interests: ['Bricolage', 'Plomberie'],
      }),
      candidate('3', {
        activity_sector: 'Aide ménagère',
        interests: ['Ménage', 'Cuisine'],
      }),
    ]);
    const service = new DiscoveryService({ prisma: prisma as never });

    // Matching either Informatique or Aide ménagère
    const sectorFiltered = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      sectors: 'Informatique / Tech, Aide ménagère',
      context: 'swipe',
    });
    expect(sectorFiltered.profiles.map((p) => p.id).sort()).toEqual(['1', '3']);

    // Matching Plomberie interest
    const interestFiltered = await service.getSwipeFeed('me', {
      latitude: 36.8,
      longitude: 10.18,
      interests: 'Plomberie',
      context: 'swipe',
    });
    expect(interestFiltered.profiles.map((p) => p.id)).toEqual(['2']);
  });

  it('retrieves distinct active sectors from database profiles', async () => {
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { activity_sector: 'Transport', category: null, service_type: 'Chauffeur' },
          { activity_sector: 'Transport', category: 'Transport', service_type: null },
          { activity_sector: 'Informatique / Tech', category: 'Tech', service_type: 'Dev' },
        ]),
      },
    };
    const service = new DiscoveryService({ prisma: prisma as never });
    const res = await service.getSectors();

    expect(res.sectors).toContain('Transport');
    expect(res.sectors).toContain('Chauffeur');
    expect(res.sectors).toContain('Informatique / Tech');
  });
});
