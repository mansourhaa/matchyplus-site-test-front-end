import { PrismaClient, Role, SwipeDirection, UserStatus } from '@saas-boilerplate/types';

import { DISCOVERY_PAGE_SIZE, DISCOVERY_RADIUS_M } from '../constants.js';
import { DiscoveryFeedQuery, FeedProfile } from '../types/matching.js';
import { AbstractServiceOptions } from '../types/services.js';
import { feedUserSelect, resolveCoords, toScoringProfile } from '../utils/discovery-feed.js';
import { notFound } from '../utils/http-errors.js';
import { computeMatchScore, haversineKm } from '../utils/matching-score.js';
import { SwipeQuotaService } from './swipe-quota.js';

/**
 * Product discovery: eligibility filters + scripted score.
 * AI MATCH jobs may later rerank; they do not own swipe/match state.
 */
export class DiscoveryService {
  prisma: PrismaClient;
  quota: SwipeQuotaService;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
    this.quota = new SwipeQuotaService({ prisma: options.prisma });
  }

  async getSwipeFeed(userId: string, query: DiscoveryFeedQuery = {}) {
    try {
      const me = await this.prisma.user.findUnique({
        where: { id: userId },
        select: feedUserSelect,
      });
      if (!me) throw notFound('profile not found');

      const myCoords = resolveCoords(query.latitude, query.longitude, me);
      const limit = Math.min(Math.max(1, query.limit ?? DISCOVERY_PAGE_SIZE), 50);

      const [blocked, matched, excludingLogs, incomingLikes] = await Promise.all([
        this.prisma.userBlock.findMany({
          where: {
            OR: [{ blocker_id: userId }, { blocked_id: userId }],
          },
          select: { blocker_id: true, blocked_id: true },
        }),
        this.prisma.match.findMany({
          where: {
            OR: [{ user_low_id: userId }, { user_high_id: userId }],
          },
          select: { user_low_id: true, user_high_id: true },
        }),
        this.prisma.swipeLog.findMany({
          where: {
            user_id: userId,
            direction: { in: [SwipeDirection.LEFT, SwipeDirection.RIGHT] },
          },
          select: { target_id: true },
          distinct: ['target_id'],
        }),
        this.prisma.swipe.findMany({
          where: {
            target_id: userId,
            direction: SwipeDirection.RIGHT,
          },
          select: { swiper_id: true },
        }),
      ]);

      const excluded = new Set<string>([userId]);
      for (const row of blocked) {
        excluded.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
      }
      for (const row of matched) {
        excluded.add(row.user_low_id === userId ? row.user_high_id : row.user_low_id);
      }
      for (const row of excludingLogs) excluded.add(row.target_id);
      // WITHDRAWN logs intentionally omitted — withdraw must not permanently hide.

      const likedMe = new Set(incomingLikes.map((row) => row.swiper_id));

      const candidates = await this.prisma.user.findMany({
        where: {
          id: { notIn: [...excluded] },
          status: UserStatus.ACTIVE,
          role: Role.USER,
        },
        select: feedUserSelect,
        take: 400,
        orderBy: { create_at: 'desc' },
      });

      const radiusM = DISCOVERY_RADIUS_M;
      const scored: FeedProfile[] = [];
      const breakdown = {
        g1_complementary: 0,
        g2_domain: 0,
        g3_network: 0,
        g4_suggestions: 0,
      };

      for (const candidate of candidates) {
        const candCoords = resolveCoords(undefined, undefined, candidate);
        let distKm: number | null = null;
        if (myCoords && candCoords) {
          distKm = haversineKm(
            myCoords.latitude,
            myCoords.longitude,
            candCoords.latitude,
            candCoords.longitude,
          );
          if (distKm * 1000 > radiusM) continue;
        }

        const score = computeMatchScore(toScoringProfile(me), toScoringProfile(candidate), distKm, {
          likedMe: likedMe.has(candidate.id),
        });

        if (score.matchGroup === 1) breakdown.g1_complementary += 1;
        else if (score.matchGroup === 2) breakdown.g2_domain += 1;
        else if (score.matchGroup === 3) breakdown.g3_network += 1;
        else breakdown.g4_suggestions += 1;

        scored.push({
          id: candidate.id,
          name: candidate.name,
          image: candidate.image,
          bio: candidate.bio,
          job: candidate.job,
          category: candidate.category,
          city: candidate.location?.city || candidate.city,
          interests: candidate.interests,
          goals: candidate.goals,
          activity_sector: candidate.activity_sector,
          service_type: candidate.service_type || candidate.job,
          rating: candidate.rating,
          distance_km: distKm == null ? null : Math.round(distKm * 10) / 10,
          match_score: score.finalScore,
          match_group: score.matchGroup,
          match_type_label: score.matchTypeLabel,
          confidence: score.confidence,
          compatibility: score.breakdown,
          liked_me: likedMe.has(candidate.id),
        });
      }

      scored.sort((a, b) => {
        if (b.match_score !== a.match_score) return b.match_score - a.match_score;
        if (a.match_group !== b.match_group) return a.match_group - b.match_group;
        return 0;
      });

      const profiles = scored.slice(0, limit);
      const quota = await this.quota.buildQuotaSnapshot(userId);

      return {
        profiles,
        count: profiles.length,
        feed_breakdown: { ...breakdown, feed_total: profiles.length },
        quota,
        scoring_version: 'v5-scripted' as const,
      };
    } catch (err) {
      throw err;
    }
  }
}
