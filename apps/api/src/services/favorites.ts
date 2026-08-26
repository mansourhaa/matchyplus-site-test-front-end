import { PrismaClient, UserStatus } from '@saas-boilerplate/types';

import {
  FavoriteIdsResponse,
  FavoriteProfile,
  FavoriteToggleResponse,
  FavoritesListQuery,
  FavoritesListResponse,
} from '../types/favorites.js';
import { AbstractServiceOptions } from '../types/services.js';
import { feedUserSelect, resolveCoords, toScoringProfile } from '../utils/discovery-feed.js';
import { badRequest, notFound } from '../utils/http-errors.js';
import { computeMatchScore, haversineKm } from '../utils/matching-score.js';

export class FavoritesService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  async getFavorites(
    userId: string,
    query: FavoritesListQuery = {},
  ): Promise<FavoritesListResponse> {
    try {
      const me = await this.prisma.user.findUnique({
        where: { id: userId },
        select: feedUserSelect,
      });
      if (!me) throw notFound('User profile not found');

      const limit = Math.min(Math.max(1, query.limit ?? 50), 100);
      const offset = Math.max(0, query.offset ?? 0);

      const [favoriteRows, total] = await Promise.all([
        this.prisma.favorite.findMany({
          where: {
            user_id: userId,
            favorited: {
              status: UserStatus.ACTIVE,
              blocks_made: { none: { blocked_id: userId } },
              blocks_received: { none: { blocker_id: userId } },
            },
          },
          include: {
            favorited: {
              select: feedUserSelect,
            },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.favorite.count({
          where: {
            user_id: userId,
            favorited: {
              status: UserStatus.ACTIVE,
              blocks_made: { none: { blocked_id: userId } },
              blocks_received: { none: { blocker_id: userId } },
            },
          },
        }),
      ]);

      const myCoords = resolveCoords(undefined, undefined, me);
      const scoringMe = toScoringProfile(me);

      const favorites: FavoriteProfile[] = favoriteRows.map((row) => {
        const target = row.favorited;
        const targetCoords = resolveCoords(undefined, undefined, target);
        const distanceKm =
          myCoords && targetCoords
            ? haversineKm(
                myCoords.latitude,
                myCoords.longitude,
                targetCoords.latitude,
                targetCoords.longitude,
              )
            : null;

        const scoringTarget = toScoringProfile(target);
        const matchResult = computeMatchScore(scoringMe, scoringTarget, distanceKm);

        return {
          id: target.id,
          name: target.name,
          job: target.job,
          category: target.category,
          city: target.city,
          bio: target.bio,
          image: target.image,
          video: target.video,
          rating: target.rating,
          reviews: target.reviews,
          profile_type: target.profile_type,
          offer_service: target.offer_service,
          service_type: target.service_type,
          price: target.price,
          experience: target.experience,
          schedule: target.schedule,
          languages: target.languages,
          interests: target.interests,
          contact_modes: target.contact_modes,
          match_score: matchResult.finalScore,
          match_type_label: matchResult.matchTypeLabel,
          distance_km: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
          favorited_at: row.created_at.toISOString(),
        };
      });

      return { favorites, total };
    } catch (err) {
      throw err;
    }
  }

  async getFavoriteIds(userId: string): Promise<FavoriteIdsResponse> {
    try {
      const favorites = await this.prisma.favorite.findMany({
        where: { user_id: userId },
        select: { favorited_id: true },
      });

      return {
        favoriteIds: favorites.map((f) => f.favorited_id),
      };
    } catch (err) {
      throw err;
    }
  }

  async toggleFavorite(userId: string, targetUserId: string): Promise<FavoriteToggleResponse> {
    try {
      if (userId === targetUserId) {
        throw badRequest('Cannot favorite your own profile');
      }

      const target = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, status: true },
      });

      if (!target || target.status !== UserStatus.ACTIVE) {
        throw notFound('Target user profile not found or inactive');
      }

      // Check blocks
      const block = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blocker_id: userId, blocked_id: targetUserId },
            { blocker_id: targetUserId, blocked_id: userId },
          ],
        },
      });
      if (block) {
        throw badRequest('Cannot favorite a blocked user');
      }

      const existing = await this.prisma.favorite.findUnique({
        where: {
          user_id_favorited_id: {
            user_id: userId,
            favorited_id: targetUserId,
          },
        },
      });

      if (existing) {
        await this.prisma.favorite.delete({
          where: { id: existing.id },
        });
        return { favorited: false, targetUserId };
      }

      await this.prisma.favorite.create({
        data: {
          user_id: userId,
          favorited_id: targetUserId,
        },
      });

      return { favorited: true, targetUserId };
    } catch (err) {
      throw err;
    }
  }

  async removeFavorite(userId: string, targetUserId: string): Promise<FavoriteToggleResponse> {
    try {
      await this.prisma.favorite.deleteMany({
        where: {
          user_id: userId,
          favorited_id: targetUserId,
        },
      });

      return { favorited: false, targetUserId };
    } catch (err) {
      throw err;
    }
  }
}
