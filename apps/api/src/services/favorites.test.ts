import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserStatus } from '@saas-boilerplate/types';

import { FavoritesService } from './favorites.js';

function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
    },
    userBlock: {
      findFirst: vi.fn(),
    },
    favorite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

function createService(prisma = createMockPrisma()) {
  const service = new FavoritesService({ prisma: prisma as never });
  return { service, prisma };
}

describe('FavoritesService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleFavorite', () => {
    it('rejects favoriting yourself', async () => {
      const { service, prisma } = createService();

      await expect(service.toggleFavorite('user-1', 'user-1')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects if target user is not found or inactive', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleFavorite('user-1', 'target-2')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('rejects if target user is blocked', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({ id: 'target-2', status: UserStatus.ACTIVE });
      prisma.userBlock.findFirst.mockResolvedValue({ id: 'block-1' });

      await expect(service.toggleFavorite('user-1', 'target-2')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('creates favorite when not already favorited', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({ id: 'target-2', status: UserStatus.ACTIVE });
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.favorite.create.mockResolvedValue({ id: 'fav-1' });

      const res = await service.toggleFavorite('user-1', 'target-2');
      expect(res).toEqual({ favorited: true, targetUserId: 'target-2' });
      expect(prisma.favorite.create).toHaveBeenCalledWith({
        data: { user_id: 'user-1', favorited_id: 'target-2' },
      });
    });

    it('deletes favorite when already favorited', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({ id: 'target-2', status: UserStatus.ACTIVE });
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.favorite.findUnique.mockResolvedValue({ id: 'fav-1' });
      prisma.favorite.delete.mockResolvedValue({ id: 'fav-1' });

      const res = await service.toggleFavorite('user-1', 'target-2');
      expect(res).toEqual({ favorited: false, targetUserId: 'target-2' });
      expect(prisma.favorite.delete).toHaveBeenCalledWith({
        where: { id: 'fav-1' },
      });
    });
  });

  describe('removeFavorite', () => {
    it('removes favorite record', async () => {
      const { service, prisma } = createService();
      prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.removeFavorite('user-1', 'target-2');
      expect(res).toEqual({ favorited: false, targetUserId: 'target-2' });
      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', favorited_id: 'target-2' },
      });
    });
  });

  describe('getFavoriteIds', () => {
    it('returns array of favorited user ids', async () => {
      const { service, prisma } = createService();
      prisma.favorite.findMany.mockResolvedValue([
        { favorited_id: 'target-1' },
        { favorited_id: 'target-2' },
      ]);

      const res = await service.getFavoriteIds('user-1');
      expect(res).toEqual({ favoriteIds: ['target-1', 'target-2'] });
    });
  });

  describe('getFavorites', () => {
    it('returns list of favorites with computed scores', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Me',
        interests: ['Tech'],
        languages: ['French'],
        goals: ['recruiter'],
        status: UserStatus.ACTIVE,
      });

      prisma.favorite.findMany.mockResolvedValue([
        {
          id: 'fav-1',
          created_at: new Date('2026-08-26T12:00:00Z'),
          favorited: {
            id: 'target-1',
            name: 'Candidate 1',
            job: 'Engineer',
            category: 'Tech',
            city: 'Paris',
            bio: 'Bio',
            image: '/photo.jpg',
            video: null,
            rating: 4.8,
            reviews: 10,
            profile_type: 'INDIVIDUAL',
            offer_service: true,
            service_type: 'Dev',
            price: '500',
            experience: '5y',
            schedule: 'Full-time',
            languages: ['French'],
            interests: ['Tech'],
            contact_modes: ['Email'],
            status: UserStatus.ACTIVE,
          },
        },
      ]);
      prisma.favorite.count.mockResolvedValue(1);

      const res = await service.getFavorites('user-1', { limit: 10 });
      expect(res.total).toBe(1);
      expect(res.favorites).toHaveLength(1);
      const first = res.favorites[0]!;
      expect(first.id).toBe('target-1');
      expect(first.name).toBe('Candidate 1');
      expect(first.match_score).toBeGreaterThan(0);
      expect(first.favorited_at).toBe('2026-08-26T12:00:00.000Z');
    });
  });
});
