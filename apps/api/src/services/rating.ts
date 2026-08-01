import { Prisma, PrismaClient } from '@saas-boilerplate/types';

import { MAX_RATING, MIN_RATING } from '../constants.js';
import { AbstractServiceOptions } from '../types/services.js';
import { badRequest, conflict, forbidden } from '../utils/http-errors.js';
import { orderedUserPair } from '../utils/match-pair.js';

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * One rating per (rater, ratee) pair, only allowed between matched, non-blocked users —
 * insert-only, there is no path to edit a rating once submitted. Every successful rating
 * recomputes the ratee's aggregate rating/review count directly from the Rating table, so
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

      const block = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blocker_id: raterId, blocked_id: rateeId },
            { blocker_id: rateeId, blocked_id: raterId },
          ],
        },
        select: { id: true },
      });
      if (block) {
        throw forbidden('interaction blocked with this user', 'blocked');
      }

      // The match check, duplicate check, insert, aggregate, and User update all run as
      // one transaction — otherwise a second request racing the same rater/ratee pair can
      // pass the pre-insert duplicate check before either commits, hit the unique index on
      // the actual insert, and surface as a raw 500 instead of the intended already_rated
      // response; worse, a failure partway through would leave a Rating row whose ratee
      // never got their aggregate recomputed, breaking the "always a true average" guarantee.
      try {
        return await this.prisma.$transaction(async (tx) => {
          const pair = orderedUserPair(raterId, rateeId);
          const match = await tx.match.findUnique({
            where: {
              user_low_id_user_high_id: {
                user_low_id: pair.userLowId,
                user_high_id: pair.userHighId,
              },
            },
            select: { id: true },
          });
          if (!match) {
            throw forbidden('you can only rate a matched profile', 'not_matched');
          }

          await tx.rating.create({ data: { rater_id: raterId, ratee_id: rateeId, value } });

          const aggregate = await tx.rating.aggregate({
            where: { ratee_id: rateeId },
            _avg: { value: true },
            _count: true,
          });
          const rating = Math.round((aggregate._avg.value ?? 0) * 100) / 100;
          const reviews = aggregate._count;

          await tx.user.update({ where: { id: rateeId }, data: { rating, reviews } });

          return { rating, reviews };
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          throw conflict('you have already rated this profile', 'already_rated');
        }
        throw error;
      }
    } catch (err) {
      throw err;
    }
  }
}
