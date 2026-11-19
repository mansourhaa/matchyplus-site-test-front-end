import { PrismaClient, Role, SwipeDirection, UserStatus } from '@saas-boilerplate/types';

import {
  DISCOVERY_MAX_DISTANCE_KM,
  DISCOVERY_PAGE_SIZE,
  DISCOVERY_RADIUS_M,
} from '../constants.js';
import { DiscoveryFeedQuery, DiscoverySectorsResponse, FeedProfile } from '../types/matching.js';
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
import { VoiceAgentsService } from './voice-agents.js';

/**
 * Product discovery: eligibility filters + scripted score.
 * AI MATCH jobs may later rerank; they do not own swipe/match state.
 */
export class DiscoveryService {
  prisma: PrismaClient;
  quota: SwipeQuotaService;
  agents: VoiceAgentsService;

  constructor(options: AbstractServiceOptions & { agents?: VoiceAgentsService }) {
    this.prisma = options.prisma;
    this.quota = new SwipeQuotaService({ prisma: options.prisma });
    this.agents = options.agents ?? new VoiceAgentsService({ prisma: options.prisma });
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
          ? Math.min(DISCOVERY_MAX_DISTANCE_KM, Math.max(1, maxDistanceKm)) * 1000
          : DISCOVERY_RADIUS_M;
      const serviceTypes = parseServiceTypes(query.serviceTypes);
      const sectors = [
        ...parseServiceTypes(query.sectors),
        ...(query.sector ? [query.sector.trim().toLowerCase()] : []),
      ];
      const interests = parseServiceTypes(query.interests);
      const needle = query.q?.trim().toLowerCase() ?? '';
      const minRatingRaw = asFiniteNumber(query.minRating);
      const minRating = minRatingRaw != null ? Math.min(5, Math.max(0, minRatingRaw)) : null;
      const minPriceRaw = asFiniteNumber(query.minPrice);
      const minPrice = minPriceRaw != null ? Math.max(0, minPriceRaw) : null;
      const maxPriceRaw = asFiniteNumber(query.maxPrice);
      const maxPrice = maxPriceRaw != null ? Math.max(0, maxPriceRaw) : null;
      const availableOnly = Boolean(query.availableOnly);
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
            direction:
              query.context === 'search'
                ? SwipeDirection.LEFT
                : { in: [SwipeDirection.LEFT, SwipeDirection.RIGHT] },
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
          onboarding_completed_at: { not: null },
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
        if (sectors.length > 0 && !matchesSectors(candidate, sectors)) continue;
        if (interests.length > 0 && !matchesInterests(candidate, interests)) continue;
        if (
          availableOnly &&
          (!candidate.availability_days || candidate.availability_days.length === 0)
        )
          continue;
        if (minPrice != null || maxPrice != null) {
          const parsedPrice = parsePriceNumber(candidate.price);
          if (parsedPrice != null) {
            if (minPrice != null && parsedPrice < minPrice) continue;
            if (maxPrice != null && parsedPrice > maxPrice) continue;
          }
        }
        if (needle && !matchesQuery(candidate, needle)) continue;

        // Language overlap: exclude candidates who do not share at least one language with the swiper.
        const myLanguages = (me.languages ?? []).map(normalizeLanguageCode);
        const candLanguages = (candidate.languages ?? []).map(normalizeLanguageCode);
        if (myLanguages.length > 0 && candLanguages.length > 0) {
          const hasCommonLanguage = myLanguages.some((lang) => candLanguages.includes(lang));
          if (!hasCommonLanguage) continue;
        }

        const candCoords = resolveCoords(undefined, undefined, candidate);
        if (!myCoords || !candCoords) {
          // Candidates without a registered GPS location are excluded from discovery swipes.
          continue;
        }

        const distKm = haversineKm(
          myCoords.latitude,
          myCoords.longitude,
          candCoords.latitude,
          candCoords.longitude,
        );
        if (distKm != null && distKm * 1000 > radiusM) continue;

        const score = computeMatchScore(toScoringProfile(me), toScoringProfile(candidate), distKm, {
          likedMe: likedMe.has(candidate.id),
          radiusKm: radiusM / 1000,
        });

        if (score.matchGroup === 1) breakdown.g1_complementary += 1;
        else if (score.matchGroup === 2) breakdown.g2_domain += 1;
        else if (score.matchGroup === 3) breakdown.g3_network += 1;
        else breakdown.g4_suggestions += 1;

        scored.push({
          id: candidate.id,
          name: candidate.name,
          image: candidate.image,
          video: candidate.video ?? null,
          bio: candidate.bio,
          job: candidate.job,
          category: candidate.category,
          city: candidate.location?.city || candidate.city,
          interests: candidate.interests,
          goals: candidate.goals,
          activity_sector: candidate.activity_sector || candidate.sector,
          service_type: candidate.service_type || candidate.job,
          price: candidate.price,
          availability_days: candidate.availability_days,
          contact_modes: candidate.contact_modes,
          verified: candidate.verified,
          rating: candidate.rating,
          reviews: candidate.reviews,
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

      // MATCHING_ENGINE=agents: the 2.0.8 agents rank the feed (off by default; on any
      // problem the built-in order above is kept).
      const byAgents = await this.agents.rank(userId, scored, radiusM / 1000);
      if (byAgents) {
        scored.splice(0, scored.length, ...byAgents);
        if (sort !== 'match') scored.sort((a, b) => compareFeedProfiles(a, b, sort));
      }

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
        video: null,
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

  async getSectors(): Promise<DiscoverySectorsResponse> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          OR: [
            { activity_sector: { not: null } },
            { category: { not: null } },
            { service_type: { not: null } },
          ],
        },
        select: {
          activity_sector: true,
          category: true,
          service_type: true,
        },
      });

      const seen = new Set<string>();
      const sectors: string[] = [];

      const add = (val?: string | null) => {
        if (!val || typeof val !== 'string') return;
        const trimmed = val.trim();
        if (!trimmed) return;
        const lower = trimmed.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          sectors.push(trimmed);
        }
      };

      for (const u of users) {
        add(u.activity_sector);
        add(u.category);
        add(u.service_type);
      }

      const defaultSectors = [
        'Informatique / Tech',
        'Transport',
        'Services & missions',
        'Service à domicile',
        'Restauration / Hôtellerie',
        'BTP / Artisanat',
        'Aide ménagère',
        'Santé / Médical',
        'Marketing / Communication',
        'Commerce / Vente',
        'Éducation / Formation',
        'Cuisine',
        'Jardinage',
        'Garde enfants',
        'Plomberie',
        'Électricité',
      ];

      for (const s of defaultSectors) {
        add(s);
      }

      return { sectors };
    } catch (err) {
      throw err;
    }
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

const INTEREST_SYNONYMS: Record<string, string[]> = {
  bricolage: ['bricolage', 'أشغال يدوية', 'أعمال يدوية', 'diy', 'handyman'],
  jardinage: ['jardinage', 'بستنة', 'حدائق', 'gardening'],
  enfants: ['enfants', 'رعاية أطفال', 'أطفال', 'childcare', 'garderie'],
  ménage: ['ménage', 'menage', 'أعمال منزلية', 'تنظيف', 'housekeeping', 'cleaning'],
  cuisine: ['cuisine', 'طبخ', 'مأكولات', 'cooking', 'culinaire'],
  informatique: ['informatique', 'معلوماتية', 'إعلام آلي', 'it', 'tech', 'computing'],
  traduction: ['traduction', 'ترجمة', 'translation'],
  graphisme: ['graphisme', 'تصميم جرافيك', 'تصميم', 'graphic design'],
  marketing: ['marketing', 'تسويق'],
  comptabilité: ['comptabilité', 'comptabilite', 'محاسبة', 'accounting'],
  transport: ['transport', 'نقل', 'توصيل'],
  déménagement: ['déménagement', 'demenagement', 'نقل أثاث', 'moving', 'رحيل'],
  plomberie: ['plomberie', 'سباكة', 'ترصيص', 'plumbing'],
  électricité: ['électricité', 'electricite', 'كهرباء', 'electricity'],
  peinture: ['peinture', 'دهانة', 'طلاء', 'painting'],
};

const SECTOR_SYNONYMS: Record<string, string[]> = {
  'services & missions': ['services & missions', 'خدمات ومهمات', 'services', 'missions'],
  'informatique / tech': [
    'informatique / tech',
    'informatique',
    'tech',
    'تكنولوجيا المعلومات',
    'معلوماتية',
  ],
  'service à domicile': [
    'service à domicile',
    'service a domicile',
    'خدمات منزلية',
    'home service',
  ],
  'chauffeur / transport': [
    'chauffeur / transport',
    'chauffeur',
    'transport',
    'سائق / نقل',
    'driver / transport',
  ],
  'aide ménagère': ['aide ménagère', 'aide menagere', 'مساعدة منزلية', 'housekeeper'],
  'restauration / hôtellerie': [
    'restauration / hôtellerie',
    'restauration / hotellerie',
    'restauration',
    'hôtellerie',
    'مطاعم / فندقة',
    'catering',
  ],
  'marketing / communication': [
    'marketing / communication',
    'تسويق / اتصال',
    'marketing',
    'communication',
  ],
  'btp / artisanat': ['btp / artisanat', 'بناء / حرف يدوية', 'btp', 'artisanat', 'construction'],
};

function expandSynonyms(terms: string[], synonymMap: Record<string, string[]>): string[] {
  const result = new Set<string>();
  for (const term of terms) {
    const lower = term.toLowerCase().trim();
    result.add(lower);
    for (const [key, syns] of Object.entries(synonymMap)) {
      if (
        key === lower ||
        syns.some((s) => s.toLowerCase() === lower || lower.includes(s.toLowerCase()))
      ) {
        for (const s of syns) result.add(s.toLowerCase());
      }
    }
  }
  return [...result];
}

function matchesSectors(candidate: FeedUser, sectors: string[]): boolean {
  const hay = [
    candidate.activity_sector,
    candidate.sector,
    candidate.service_type,
    candidate.job,
    candidate.category,
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());
  const expanded = expandSynonyms(sectors, SECTOR_SYNONYMS);
  return expanded.some((wanted) => hay.some((h) => h.includes(wanted)));
}

function matchesInterests(candidate: FeedUser, interests: string[]): boolean {
  if (!candidate.interests || candidate.interests.length === 0) return false;
  const hay = candidate.interests.map((value) => value.toLowerCase());
  const expanded = expandSynonyms(interests, INTEREST_SYNONYMS);
  return expanded.some((wanted) => hay.some((h) => h.includes(wanted)));
}

export function parsePriceNumber(raw?: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0].replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function matchesQuery(candidate: FeedUser, needle: string): boolean {
  const hay = [
    candidate.name,
    candidate.job,
    candidate.service_type,
    candidate.category,
    candidate.activity_sector,
    candidate.sector,
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
  if (sort === 'price_asc') {
    const pa = parsePriceNumber(a.price);
    const pb = parsePriceNumber(b.price);
    if (pa != null && pb != null && pa !== pb) return pa - pb;
    if (pa != null && pb == null) return -1;
    if (pa == null && pb != null) return 1;
    return b.match_score - a.match_score;
  }
  if (sort === 'price_desc') {
    const pa = parsePriceNumber(a.price);
    const pb = parsePriceNumber(b.price);
    if (pa != null && pb != null && pa !== pb) return pb - pa;
    if (pa != null && pb == null) return -1;
    if (pa == null && pb != null) return 1;
    return b.match_score - a.match_score;
  }
  if (a.match_group !== b.match_group) return a.match_group - b.match_group;
  if (b.match_score !== a.match_score) return b.match_score - a.match_score;
  return 0;
}

export function normalizeLanguageCode(lang: string): string {
  const clean = lang.trim().toLowerCase();
  if (clean === 'ar' || clean.startsWith('ar') || clean.includes('arab')) return 'ar';
  if (clean === 'fr' || clean.startsWith('fr') || clean.includes('fran')) return 'fr';
  if (clean === 'en' || clean.startsWith('en') || clean.includes('angl') || clean.includes('eng'))
    return 'en';
  if (clean === 'it' || clean.startsWith('it') || clean.includes('ital')) return 'it';
  if (clean === 'de' || clean.startsWith('de') || clean.includes('allem') || clean.includes('germ'))
    return 'de';
  if (clean === 'es' || clean.startsWith('es') || clean.includes('esp')) return 'es';
  return clean;
}
