import { afterEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@saas-boilerplate/types';

import { RatingService } from './rating.js';

function createMockPrisma() {
  return {
    userBlock: { findFirst: vi.fn() },
    match: { findUnique: vi.fn() },
    rating: { create: vi.fn(), aggregate: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  };
}

function createService(prisma = createMockPrisma()) {
  prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(prisma),
  );
  const service = new RatingService({ prisma: prisma as never });
  return { service, prisma };
}

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('RatingService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rate', () => {
    it('rejects rating yourself before checking anything else', async () => {
      const { service, prisma } = createService();

      await expect(service.rate('user-1', 'user-1', 5)).rejects.toMatchObject({
        statusCode: 400,
        code: 'cannot_rate_self',
      });
      expect(prisma.userBlock.findFirst).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([0, 6, 3.5, Number.NaN])(
      'rejects an out-of-range or non-integer rating (%s)',
      async (value) => {
        const { service, prisma } = createService();

        await expect(service.rate('user-1', 'user-2', value)).rejects.toMatchObject({
          statusCode: 400,
          code: 'invalid_rating',
        });
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('rejects when the two users have a block between them, before opening a transaction', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue({ id: 'block-1' });

      await expect(service.rate('user-1', 'user-2', 5)).rejects.toMatchObject({
        statusCode: 403,
        code: 'blocked',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects when the two users are not matched', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.match.findUnique.mockResolvedValue(null);

      await expect(service.rate('user-1', 'user-2', 5)).rejects.toMatchObject({
        statusCode: 403,
        code: 'not_matched',
      });
      expect(prisma.rating.create).not.toHaveBeenCalled();
    });

    it('creates the rating and recomputes the ratee aggregate from the Rating table, all inside one transaction', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.match.findUnique.mockResolvedValue({ id: 'match-1' });
      prisma.rating.create.mockResolvedValue({ id: 'rating-1' });
      prisma.rating.aggregate.mockResolvedValue({ _avg: { value: 4.5 }, _count: 2 });

      const result = await service.rate('user-1', 'user-2', 5);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.match.findUnique).toHaveBeenCalledWith({
        where: { user_low_id_user_high_id: { user_low_id: 'user-1', user_high_id: 'user-2' } },
        select: { id: true },
      });
      expect(prisma.rating.create).toHaveBeenCalledWith({
        data: { rater_id: 'user-1', ratee_id: 'user-2', value: 5 },
      });
      expect(prisma.rating.aggregate).toHaveBeenCalledWith({
        where: { ratee_id: 'user-2' },
        _avg: { value: true },
        _count: true,
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { rating: 4.5, reviews: 2 },
      });
      expect(result).toEqual({ rating: 4.5, reviews: 2 });
    });

    it('maps a unique-constraint violation from a concurrent duplicate insert to a clean already_rated conflict', async () => {
      const { service, prisma } = createService();
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.match.findUnique.mockResolvedValue({ id: 'match-1' });
      prisma.rating.create.mockRejectedValue(uniqueViolation());

      await expect(service.rate('user-1', 'user-2', 5)).rejects.toMatchObject({
        statusCode: 409,
        code: 'already_rated',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
