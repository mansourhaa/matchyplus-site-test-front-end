import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserStatus } from '@saas-boilerplate/types';

import { ProsService } from './pros.js';

function createService() {
  const prisma = { user: { count: vi.fn().mockResolvedValue(35) } };
  const service = new ProsService({ prisma: prisma as never });
  return { service, prisma };
}

describe('ProsService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('counts active users who offer the trade in the city', async () => {
    const { service, prisma } = createService();

    await expect(service.count({ service: ' Plombier ', city: ' Sousse ' })).resolves.toEqual({
      service: 'Plombier',
      city: 'Sousse',
      count: 35,
    });

    const where = prisma.user.count.mock.calls[0][0].where;
    expect(where.status).toBe(UserStatus.ACTIVE);
    expect(where.offer_service).toBe(true);
    expect(where.city).toEqual({ contains: 'Sousse', mode: 'insensitive' });
    // the trade is searched in service_type, job and category
    expect(where.OR).toContainEqual({ service_type: { contains: 'plumber', mode: 'insensitive' } });
    expect(where.OR).toContainEqual({ job: { contains: 'سباك', mode: 'insensitive' } });
    expect(where.OR).toContainEqual({ category: { contains: 'plombier', mode: 'insensitive' } });
  });

  it('widens a trade to its taxonomy variants in every language', () => {
    const { service } = createService();
    const fromFrench = service.tradeTerms('plombier');
    const fromArabic = service.tradeTerms('سباك');

    for (const terms of [fromFrench, fromArabic]) {
      expect(terms).toEqual(expect.arrayContaining(['plombier', 'plumber', 'سباك']));
    }
  });

  it('searches an unknown word as typed, without guessing', () => {
    const { service } = createService();
    expect(service.tradeTerms('astronaute')).toEqual(['astronaute']);
  });

  it('rethrows database errors', async () => {
    const { service, prisma } = createService();
    prisma.user.count.mockRejectedValueOnce(new Error('db down'));

    await expect(service.count({ service: 'Plombier', city: 'Sousse' })).rejects.toThrow('db down');
  });
});
