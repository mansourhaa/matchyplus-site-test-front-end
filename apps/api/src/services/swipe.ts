import { PrismaClient, SwipeDirection, UserPlan } from '@saas-boilerplate/types';

import { MatchSummary, PostSwipeBody, SwipeResult } from '../types/matching.js';
import { AbstractServiceOptions } from '../types/services.js';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  tooManyRequests,
} from '../utils/http-errors.js';
import { orderedUserPair, otherUserId } from '../utils/match-pair.js';
import { ConversationService } from './conversation.js';
import { SwipeQuotaService } from './swipe-quota.js';

export type MatchNotifier = (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) => void;

/**
 * Swipe / match domain. Quota always re-read from SwipeLog after writes.
 * Withdraw uses WITHDRAWN — never LEFT — so feed eligibility is preserved.
 * Conversation lifecycle is owned by ConversationService (thin hooks only).
 */
export class SwipeService {
  prisma: PrismaClient;
  quota: SwipeQuotaService;
  conversations: ConversationService;
  notify: MatchNotifier;

  constructor(options: AbstractServiceOptions & { notify?: MatchNotifier }) {
    this.prisma = options.prisma;
    this.quota = new SwipeQuotaService({ prisma: options.prisma });
    this.notify = options.notify ?? (() => undefined);
    this.conversations = new ConversationService({
      prisma: options.prisma,
      notify: this.notify,
    });
  }

  private async assertNotBlocked(a: string, b: string): Promise<void> {
    try {
      const block = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blocker_id: a, blocked_id: b },
            { blocker_id: b, blocked_id: a },
          ],
        },
        select: { id: true },
      });
      if (block) throw forbidden('interaction blocked with this user');
    } catch (err) {
      throw err;
    }
  }

  private async detectMatch(
    swiperId: string,
    targetId: string,
  ): Promise<(MatchSummary & { created: boolean }) | null> {
    try {
      const reciprocal = await this.prisma.swipe.findFirst({
        where: {
          swiper_id: targetId,
          target_id: swiperId,
          direction: SwipeDirection.RIGHT,
        },
        select: { id: true },
      });
      if (!reciprocal) return null;

      const pair = orderedUserPair(swiperId, targetId);
      const existing = await this.prisma.match.findUnique({
        where: {
          user_low_id_user_high_id: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        },
      });

      const match =
        existing ??
        (await this.prisma.match.create({
          data: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        }));

      if (!existing) {
        await this.prisma.user.updateMany({
          where: { id: { in: [swiperId, targetId] } },
          data: { matches: { increment: 1 } },
        });
      }

      return {
        match_id: match.id,
        matched_at: match.matched_at,
        matched_user_id: targetId,
        created: !existing,
      };
    } catch (err) {
      throw err;
    }
  }

  async postSwipe(userId: string, body: PostSwipeBody): Promise<SwipeResult> {
    try {
      const directionRaw = String(body.direction || '').toLowerCase();
      if (directionRaw !== 'left' && directionRaw !== 'right') {
        throw badRequest("direction must be 'left' or 'right'");
      }
      const targetId = body.target_user_id;
      if (!targetId) throw badRequest('target_user_id is required');
      if (targetId === userId) throw badRequest('cannot swipe your own profile');

      const target = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, image: true },
      });
      if (!target) throw notFound('target profile not found');

      await this.assertNotBlocked(userId, targetId);

      const direction = directionRaw === 'right' ? SwipeDirection.RIGHT : SwipeDirection.LEFT;

      const { unlimited } = await this.quota.resolveSwipeQuota(userId);
      if (direction === SwipeDirection.RIGHT && !unlimited) {
        const quota = await this.quota.buildQuotaSnapshot(userId);
        if ((quota.remaining ?? 0) <= 0) {
          throw tooManyRequests('daily swipe limit reached');
        }
      }

      const existing = await this.prisma.swipe.findUnique({
        where: {
          swiper_id_target_id: { swiper_id: userId, target_id: targetId },
        },
        select: { direction: true },
      });
      const previousDirection = existing?.direction;

      const swipe = await this.prisma.swipe.upsert({
        where: {
          swiper_id_target_id: { swiper_id: userId, target_id: targetId },
        },
        create: {
          swiper_id: userId,
          target_id: targetId,
          direction,
        },
        update: { direction },
      });

      await this.prisma.swipeLog.create({
        data: {
          user_id: userId,
          target_id: targetId,
          direction,
        },
      });

      let match: MatchSummary | null = null;

      if (direction === SwipeDirection.RIGHT) {
        if (previousDirection !== SwipeDirection.RIGHT) {
          const me = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, image: true },
          });
          const firstName =
            String(me?.name || '')
              .trim()
              .split(/\s+/)[0] || 'Someone';
          this.notify(targetId, 'notification_match', {
            event_type: 'match_request',
            title: 'Match request',
            body: `${firstName} sent you a match request.`,
            actor_first_name: firstName,
            sender_picture: me?.image || null,
            from_user_id: userId,
          });
        }

        const detected = await this.detectMatch(userId, targetId);

        if (detected) {
          const conversation = await this.conversations.ensureForMatch(
            detected.match_id,
            userId,
            targetId,
          );

          if (detected.created) {
            const payload = {
              event_type: 'match',
              match_id: detected.match_id,
              matched_at: detected.matched_at,
              conversation_id: conversation.id,
              body: 'New match! Open your matches to continue.',
            };
            // Bilateral notify — both users get the same match event.
            this.notify(userId, 'notification_match', {
              ...payload,
              matched_user_id: targetId,
            });
            this.notify(targetId, 'notification_match', {
              ...payload,
              matched_user_id: userId,
            });
          }

          match = {
            match_id: detected.match_id,
            matched_at: detected.matched_at,
            matched_user_id: detected.matched_user_id,
            conversation_id: conversation.id,
          };
        }
      }

      // Always re-read quota from SwipeLog — never trust an in-memory counter.
      const quota = await this.quota.buildQuotaSnapshot(userId);

      return {
        swipe_id: swipe.id,
        direction,
        match,
        quota,
      };
    } catch (err) {
      throw err;
    }
  }

  async listMatches(userId: string) {
    try {
      const rows = await this.prisma.match.findMany({
        where: {
          OR: [{ user_low_id: userId }, { user_high_id: userId }],
        },
        orderBy: { matched_at: 'desc' },
        include: {
          conversation: { select: { id: true } },
        },
      });

      const otherIds = rows.map((row) =>
        otherUserId({ userLowId: row.user_low_id, userHighId: row.user_high_id }, userId),
      );
      const users = await this.prisma.user.findMany({
        where: { id: { in: otherIds } },
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          job: true,
          category: true,
          city: true,
          interests: true,
          activity_sector: true,
          service_type: true,
          rating: true,
        },
      });
      const byId = new Map(users.map((u) => [u.id, u]));

      return {
        matches: rows.map((row) => {
          const matchedUserId = otherUserId(
            { userLowId: row.user_low_id, userHighId: row.user_high_id },
            userId,
          );
          return {
            match_id: row.id,
            matched_at: row.matched_at,
            matched_user_id: matchedUserId,
            conversation_id: row.conversation?.id ?? null,
            profile: byId.get(matchedUserId) || null,
          };
        }),
        count: rows.length,
      };
    } catch (err) {
      throw err;
    }
  }

  async listPending(userId: string) {
    try {
      const rights = await this.prisma.swipe.findMany({
        where: { swiper_id: userId, direction: SwipeDirection.RIGHT },
        orderBy: { updated_at: 'desc' },
        include: {
          target: {
            select: {
              id: true,
              name: true,
              image: true,
              bio: true,
              job: true,
              category: true,
              city: true,
              interests: true,
              activity_sector: true,
              service_type: true,
              rating: true,
            },
          },
        },
      });

      const matches = await this.prisma.match.findMany({
        where: {
          OR: [{ user_low_id: userId }, { user_high_id: userId }],
        },
        select: { user_low_id: true, user_high_id: true },
      });
      const matchedIds = new Set(
        matches.map((m) =>
          otherUserId({ userLowId: m.user_low_id, userHighId: m.user_high_id }, userId),
        ),
      );

      const pending = rights
        .filter((row) => !matchedIds.has(row.target_id))
        .map((row) => ({
          swipe_id: row.id,
          liked_at: row.updated_at,
          profile: row.target,
        }));

      return { pending, count: pending.length };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Withdraw a one-way like without treating it as a permanent pass.
   * Logs WITHDRAWN so Discovery still shows the profile again.
   */
  async withdrawPending(userId: string, targetId: string) {
    try {
      if (!targetId) throw badRequest('target user id is required');

      const target = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!target) throw notFound('profile not found');

      const pair = orderedUserPair(userId, targetId);
      const existingMatch = await this.prisma.match.findUnique({
        where: {
          user_low_id_user_high_id: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        },
        select: { id: true },
      });
      if (existingMatch) {
        throw conflict('match already accepted — use unmatch');
      }

      const deleted = await this.prisma.swipe.deleteMany({
        where: {
          swiper_id: userId,
          target_id: targetId,
          direction: SwipeDirection.RIGHT,
        },
      });
      if (deleted.count === 0) {
        throw notFound('no pending request for this profile');
      }

      await this.prisma.swipeLog.create({
        data: {
          user_id: userId,
          target_id: targetId,
          direction: SwipeDirection.WITHDRAWN,
        },
      });

      return { withdrawn_user_id: targetId };
    } catch (err) {
      throw err;
    }
  }

  async unmatch(userId: string, otherUserId: string) {
    try {
      if (!otherUserId) throw badRequest('target user id is required');
      if (otherUserId === userId) throw badRequest('cannot unmatch yourself');

      const pair = orderedUserPair(userId, otherUserId);

      await this.conversations.detachOnUnmatch(userId, otherUserId);

      await this.prisma.$transaction(async (tx) => {
        await tx.swipe.deleteMany({
          where: {
            OR: [
              { swiper_id: userId, target_id: otherUserId },
              { swiper_id: otherUserId, target_id: userId },
            ],
          },
        });
        await tx.swipeLog.deleteMany({
          where: {
            OR: [
              { user_id: userId, target_id: otherUserId },
              { user_id: otherUserId, target_id: userId },
            ],
          },
        });
        await tx.match.deleteMany({
          where: {
            user_low_id: pair.userLowId,
            user_high_id: pair.userHighId,
          },
        });
      });

      this.notify(userId, 'match_removed', { matched_user_id: otherUserId });
      this.notify(otherUserId, 'match_removed', { matched_user_id: userId });

      return { removed_user_id: otherUserId };
    } catch (err) {
      throw err;
    }
  }

  async getQuota(userId: string) {
    try {
      return this.quota.buildQuotaSnapshot(userId);
    } catch (err) {
      throw err;
    }
  }

  async getWhoLikedMe(userId: string) {
    try {
      const { plan, unlimited } = await this.quota.resolveSwipeQuota(userId);
      const allowed = unlimited || plan === UserPlan.PREMIUM || plan === UserPlan.PREMIUM_PLUS;
      if (!allowed) {
        throw forbidden('premium plan required');
      }

      const incoming = await this.prisma.swipe.findMany({
        where: { target_id: userId, direction: SwipeDirection.RIGHT },
        orderBy: { updated_at: 'desc' },
        include: {
          swiper: {
            select: {
              id: true,
              name: true,
              image: true,
              bio: true,
              job: true,
              category: true,
              city: true,
              interests: true,
              activity_sector: true,
              service_type: true,
              rating: true,
            },
          },
        },
      });

      const matches = await this.prisma.match.findMany({
        where: {
          OR: [{ user_low_id: userId }, { user_high_id: userId }],
        },
        select: { user_low_id: true, user_high_id: true },
      });
      const matchedIds = new Set(
        matches.map((m) =>
          otherUserId({ userLowId: m.user_low_id, userHighId: m.user_high_id }, userId),
        ),
      );

      const who_liked_me = incoming
        .filter((row) => !matchedIds.has(row.swiper_id))
        .map((row) => ({
          liked_at: row.updated_at,
          profile: row.swiper,
        }));

      return { who_liked_me, count: who_liked_me.length };
    } catch (err) {
      throw err;
    }
  }

  async getStats(userId: string) {
    try {
      const [rights, lefts, pending, matches, quota] = await Promise.all([
        this.prisma.swipe.count({
          where: { swiper_id: userId, direction: SwipeDirection.RIGHT },
        }),
        this.prisma.swipe.count({
          where: { swiper_id: userId, direction: SwipeDirection.LEFT },
        }),
        this.listPending(userId),
        this.listMatches(userId),
        this.getQuota(userId),
      ]);

      return {
        likes: rights,
        passes: lefts,
        pending: pending.count,
        matches: matches.count,
        quota,
      };
    } catch (err) {
      throw err;
    }
  }
}
