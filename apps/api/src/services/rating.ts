import { PrismaClient } from '@saas-boilerplate/types';

import { AbstractServiceOptions } from '../types/services.js';
import { badRequest, conflict, forbidden } from '../utils/http-errors.js';
import { orderedUserPair } from '../utils/match-pair.js';

const MIN_RATING = 1;
const MAX_RATING = 5;

/**
 * One rating per (rater, ratee) pair, only allowed between matched users — insert-only,
 * there is no path to edit a rating once submitted. Every successful rating recomputes
 * the ratee's aggregate rating/review count directly from the Rating table, so
 * User.rating/reviews always reflect a true average rather than an incrementally
 * maintained running total that could drift.
 */
export class RatingService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  async rate(
    raterId: string,
    rateeId: string,
    value: number,
  ): Promise<{ rating: number; reviews: number }> {
    try {
      if (raterId === rateeId) {
        throw badRequest('you cannot rate yourself', 'cannot_rate_self');
      }
      if (!Number.isInteger(value) || value < MIN_RATING || value > MAX_RATING) {
        throw badRequest('rating must be a whole number from 1 to 5', 'invalid_rating');
      }

      const pair = orderedUserPair(raterId, rateeId);
      const match = await this.prisma.match.findUnique({
        where: {
          user_low_id_user_high_id: { user_low_id: pair.userLowId, user_high_id: pair.userHighId },
        },
        select: { id: true },
      });
      if (!match) {
        throw forbidden('you can only rate a matched profile', 'not_matched');
      }

      const existing = await this.prisma.rating.findUnique({
        where: { rater_id_ratee_id: { rater_id: raterId, ratee_id: rateeId } },
        select: { id: true },
      });
      if (existing) {
        throw conflict('you have already rated this profile', 'already_rated');
      }

      await this.prisma.rating.create({ data: { rater_id: raterId, ratee_id: rateeId, value } });

      const aggregate = await this.prisma.rating.aggregate({
        where: { ratee_id: rateeId },
        _avg: { value: true },
        _count: true,
      });
      const rating = Math.round((aggregate._avg.value ?? 0) * 100) / 100;
      const reviews = aggregate._count;

      await this.prisma.user.update({ where: { id: rateeId }, data: { rating, reviews } });

      return { rating, reviews };
    } catch (err) {
      throw err;
    }
  }
}
