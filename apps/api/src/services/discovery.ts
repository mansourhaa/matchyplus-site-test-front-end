import { PrismaClient, Role, SwipeDirection, UserStatus } from '@saas-boilerplate/types';

import { DISCOVERY_PAGE_SIZE, DISCOVERY_RADIUS_M } from '../constants.js';
import { DiscoveryFeedQuery, FeedProfile } from '../types/matching.js';
import { AbstractServiceOptions } from '../types/services.js';
import {
  FeedUser,
  feedUserSelect,
  resolveCoords,
  toScoringProfile,
} from '../utils/discovery-feed.js';
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

      const myCoords = resolveCoords(
        asFiniteNumber(query.latitude),
        asFiniteNumber(query.longitude),
        me,
      );
      const limit = Math.min(Math.max(1, asFiniteNumber(query.limit) ?? DISCOVERY_PAGE_SIZE), 50);
      const offset = Math.max(0, asFiniteNumber(query.offset) ?? 0);
      const maxDistanceKm = asFiniteNumber(query.maxDistanceKm);
      const radiusM =
        maxDistanceKm != null
          ? Math.min(200, Math.max(1, maxDistanceKm)) * 1000
          : DISCOVERY_RADIUS_M;
      const serviceTypes = parseServiceTypes(query.serviceTypes);
      const needle = query.q?.trim().toLowerCase() ?? '';
      const minRatingRaw = asFiniteNumber(query.minRating);
      const minRating = minRatingRaw != null ? Math.min(5, Math.max(0, minRatingRaw)) : null;
      const sort = query.sort ?? 'match';

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
          ...(query.profileType ? { profile_type: query.profileType } : {}),
        },
        select: feedUserSelect,
        take: 400,
        orderBy: { create_at: 'desc' },
      });

      const scored: FeedProfile[] = [];
      const breakdown = {
        g1_complementary: 0,
        g2_domain: 0,
        g3_network: 0,
        g4_suggestions: 0,
      };

      for (const candidate of candidates) {
        if (minRating != null && candidate.rating < minRating) continue;
        if (serviceTypes.length > 0 && !matchesServiceTypes(candidate, serviceTypes)) continue;
        if (needle && !matchesQuery(candidate, needle)) continue;

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
        } else if (maxDistanceKm != null) {
          // Explicit distance filter with no coords → cannot satisfy the radius.
          continue;
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

      scored.sort((a, b) => compareFeedProfiles(a, b, sort));

      const page = scored.slice(offset, offset + limit);
      const hasMore = offset + limit < scored.length;
      const quota = await this.quota.buildQuotaSnapshot(userId);

      const lockedProfiles =
        query.context === 'search'
          ? await this.applySearchVisibilityLock(userId, page, offset)
          : page.map((profile) => ({ ...profile, is_locked: false }));

      return {
        profiles: lockedProfiles,
        count: lockedProfiles.length,
        offset,
        limit,
        has_more: hasMore,
        feed_breakdown: { ...breakdown, feed_total: scored.length },
        quota,
        scoring_version: 'v5-scripted' as const,
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Freemium search: first N profiles stay fully visible; the rest keep only
   * non-identifying fields so blur cannot be bypassed via DevTools / API replay.
   * Locked rows use opaque ids that cannot be swiped or opened as profiles.
   */
  private async applySearchVisibilityLock(
    userId: string,
    profiles: FeedProfile[],
    pageOffset = 0,
  ): Promise<FeedProfile[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    const planRow = await this.prisma.plan.findUnique({
      where: { id: user?.plan ?? 'FREE' },
      select: { profiles_per_category: true },
    });

    const visibleLimit = planRow?.profiles_per_category ?? 3;
    if (visibleLimit < 0) {
      return profiles.map((profile) => ({ ...profile, is_locked: false }));
    }

    return profiles.map((profile, index) => {
      const absoluteIndex = pageOffset + index;
      if (absoluteIndex < visibleLimit) {
        return { ...profile, is_locked: false };
      }

      return {
        id: `locked-${absoluteIndex}`,
        name: '███████',
        image: null,
        bio: null,
        job: null,
        category: profile.category,
        city: null,
        interests: [],
        goals: [],
        activity_sector: null,
        service_type: profile.service_type || profile.job || profile.category,
        rating: profile.rating,
        distance_km: profile.distance_km,
        match_score: 0,
        match_group: profile.match_group,
        match_type_label: '',
        confidence: 'low',
        compatibility: [],
        liked_me: false,
        is_locked: true,
      };
    });
  }
}

export function parseServiceTypes(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function asFiniteNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function matchesServiceTypes(candidate: FeedUser, serviceTypes: string[]): boolean {
  const labels = [candidate.service_type, candidate.job, candidate.category]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());
  return serviceTypes.some((wanted) => labels.some((label) => label.includes(wanted)));
}

function matchesQuery(candidate: FeedUser, needle: string): boolean {
  const hay = [
    candidate.name,
    candidate.job,
    candidate.service_type,
    candidate.category,
    candidate.city,
    candidate.location?.city,
    ...(candidate.interests || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

function compareFeedProfiles(
  a: FeedProfile,
  b: FeedProfile,
  sort: NonNullable<DiscoveryFeedQuery['sort']>,
): number {
  if (sort === 'distance') {
    const da = a.distance_km;
    const db = b.distance_km;
    if (da == null && db == null) return b.match_score - a.match_score;
    if (da == null) return 1;
    if (db == null) return -1;
    if (da !== db) return da - db;
    return b.match_score - a.match_score;
  }
  if (sort === 'rating') {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.match_score - a.match_score;
  }
  if (b.match_score !== a.match_score) return b.match_score - a.match_score;
  if (a.match_group !== b.match_group) return a.match_group - b.match_group;
  return 0;
}
