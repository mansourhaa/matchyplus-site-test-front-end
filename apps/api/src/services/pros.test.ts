import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserStatus } from '@saas-boilerplate/types';

import { PRO_COUNT_CACHE_TTL_SECONDS } from '../constants.js';
import { ProsService } from './pros.js';

function createService({ withRedis = false } = {}) {
  const prisma = { user: { count: vi.fn().mockResolvedValue(35) } };
  const redis = withRedis
    ? { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue('OK') }
    : null;
  const service = new ProsService({ prisma: prisma as never, redis: redis as never });
  return { service, prisma, redis };
}

describe('ProsService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('count', () => {
    it('counts active users who offer the trade in exactly that city', async () => {
      const { service, prisma } = createService();

      await expect(service.count({ service: ' Plombier ', city: ' Sousse ' })).resolves.toEqual({
        service: 'Plombier',
        city: 'Sousse',
        count: 35,
      });

      const where = prisma.user.count.mock.calls[0][0].where;
      expect(where.status).toBe(UserStatus.ACTIVE);
      expect(where.offer_service).toBe(true);
      // exact city, case-insensitive: "Tunis" must not count "Tunisie" or "Tunis 2"
      expect(where.city).toEqual({ equals: 'Sousse', mode: 'insensitive' });
      // the trade is searched in service_type, job and category, in every language
      expect(where.OR).toContainEqual({
        service_type: { contains: 'plumber', mode: 'insensitive' },
      });
      expect(where.OR).toContainEqual({ job: { contains: 'سباك', mode: 'insensitive' } });
      expect(where.OR).toContainEqual({ category: { contains: 'plombier', mode: 'insensitive' } });
    });

    it('does not query the database for a trade made only of too-short words', async () => {
      const { service, prisma } = createService();

      await expect(service.count({ service: 'ab', city: 'Sousse' })).resolves.toEqual({
        service: 'ab',
        city: 'Sousse',
        count: 0,
      });
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('rethrows database errors', async () => {
      const { service, prisma } = createService();
      prisma.user.count.mockRejectedValueOnce(new Error('db down'));

      await expect(service.count({ service: 'Plombier', city: 'Sousse' })).rejects.toThrow(
        'db down',
      );
    });
  });

  describe('Redis cache', () => {
    it('answers from the cache without touching the database', async () => {
      const { service, prisma, redis } = createService({ withRedis: true });
      redis!.get.mockResolvedValueOnce('12');

      await expect(service.count({ service: 'Plombier', city: 'Sousse' })).resolves.toEqual({
        service: 'Plombier',
        city: 'Sousse',
        count: 12,
      });
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('stores a fresh count for the TTL', async () => {
      const { service, redis } = createService({ withRedis: true });

      await service.count({ service: 'Plombier', city: 'Sousse' });

      expect(redis!.set).toHaveBeenCalledWith(
        service.cacheKey('Plombier', 'Sousse'),
        '35',
        'EX',
        PRO_COUNT_CACHE_TTL_SECONDS,
      );
    });

    it('uses one key per search, whatever the case', () => {
      const { service } = createService();
      expect(service.cacheKey('Plombier', 'Sousse')).toBe(service.cacheKey('PLOMBIER', 'sousse'));
      expect(service.cacheKey('Plombier', 'Sousse')).not.toBe(service.cacheKey('Plombier', 'Sfax'));
    });

    it('falls back to the database when Redis fails, and still answers', async () => {
      const { service, prisma, redis } = createService({ withRedis: true });
      redis!.get.mockRejectedValueOnce(new Error('redis down'));
      redis!.set.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.count({ service: 'Plombier', city: 'Sousse' })).resolves.toMatchObject({
        count: 35,
      });
      expect(prisma.user.count).toHaveBeenCalledTimes(1);
    });

    it('ignores a corrupted cached value', async () => {
      const { service, prisma, redis } = createService({ withRedis: true });
      redis!.get.mockResolvedValueOnce('not-a-number');

      await expect(service.count({ service: 'Plombier', city: 'Sousse' })).resolves.toMatchObject({
        count: 35,
      });
      expect(prisma.user.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('tradeTerms', () => {
    it('widens a trade to its taxonomy variants in every language', () => {
      const { service } = createService();
      for (const typed of ['plombier', 'سباك']) {
        expect(service.tradeTerms(typed)).toEqual(
          expect.arrayContaining(['plombier', 'plumber', 'سباك']),
        );
      }
    });

    it('searches an unknown word as typed, without guessing', () => {
      const { service } = createService();
      expect(service.tradeTerms('astronaute')).toEqual(['astronaute']);
    });

    it('drops words shorter than 4 letters (they would match almost everything)', () => {
      const { service } = createService();
      expect(service.tradeTerms('ab')).toEqual([]);
      expect(service.tradeTerms('art')).toEqual([]);
    });
  });
});
