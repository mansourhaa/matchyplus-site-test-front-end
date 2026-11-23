import { PrismaClient, SwipeDirection } from '@saas-boilerplate/types';

import { FeedProfile } from '../types/matching.js';

/**
 * Profile fields the agents read (classification, behaviour, matching). Matching attributes
 * and ids only: no name, phone, email, bio or media path is sent to voice-ai.
 */
export const agentProfileSelect = {
  id: true,
  job: true,
  service_type: true,
  industry: true,
  interests: true,
  selected_goals: true,
  profile_type: true,
  availability_days: true,
  availability_hours: true,
  languages: true,
  rating: true,
  reviews: true,
  video: true,
  plan: true,
} as const;

type AgentProfileRow = {
  id: string;
  job: string | null;
  service_type: string | null;
  industry: string | null;
  interests: string[];
  selected_goals: string[];
  profile_type: string | null;
  availability_days: string[];
  availability_hours: string[];
  languages: string[];
  rating: number | null;
  reviews: number | null;
  video: string | null;
  plan: string | null;
};

/** What voice-ai receives for a profile: the video only as « has one or not ». */
function toAgentProfile(row: AgentProfileRow) {
  const { video, ...attributes } = row;
  return { ...attributes, video: Boolean(video) };
}

type AgentResult = {
  id: string;
  score: number;
  confidence: string;
  dimensions: { key: string; score: number; weight: number; contribution: number }[];
};

type AgentsFeedResponse = {
  ok?: boolean;
  results?: AgentResult[];
  sponsored?: string | null;
};

/** Engine dimensions → the names the app already shows (same six dimensions of the chef's engine). */
const DIMENSION_NAMES: Record<string, string> = {
  interests: 'skills',
  geo: 'proximity',
  goals: 'goals',
  availability: 'availability',
  language: 'languages',
  quality: 'quality',
};

const DEFAULT_VOICE_AI_URL = 'http://localhost:8001';
// Tight: the home feed must not wait for the agents (built-in order is kept on timeout).
const AGENTS_TIMEOUT_MS = 1500;
const SWIPE_HISTORY = 500;

function candidateUrls(baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, '');
  const onHost = base.replace('://host.docker.internal', '://localhost');
  return onHost === base ? [base] : [base, onHost];
}

export type VoiceAgentsOptions = {
  prisma: PrismaClient;
  enabled?: boolean;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Optional ranking of the home feed by the matching agents of the 2.0.8 demo (apps/voice-ai,
 * POST /agents/feed): classification, behaviour learned from the swipes, the chef's engine
 * (AIMatchingEngine.ts) and the ×3 video boost. Off unless MATCHING_ENGINE=agents. The app
 * keeps its own filters, quotas, likes and matches; when the voice service cannot be reached,
 * the feed keeps the built-in score, so nothing breaks.
 */
export class VoiceAgentsService {
  readonly enabled: boolean;
  private readonly prisma: PrismaClient;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: VoiceAgentsOptions) {
    this.prisma = options.prisma;
    this.enabled = options.enabled ?? process.env.MATCHING_ENGINE === 'agents';
    this.baseUrl = options.baseUrl ?? (process.env.VOICE_AI_URL || DEFAULT_VOICE_AI_URL);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /**
   * Rewrites score, confidence and breakdown of the feed with the agents, and returns the
   * profiles in the agents' order (the boosted one second). Null when the agents are off or
   * unavailable: the caller then keeps its own order.
   */
  async rank(
    userId: string,
    profiles: FeedProfile[],
    radiusKm: number,
  ): Promise<FeedProfile[] | null> {
    if (!this.enabled || profiles.length === 0) return null;
    try {
      const ids = profiles.map((profile) => profile.id);
      const [me, details, logs] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: agentProfileSelect }),
        this.prisma.user.findMany({ where: { id: { in: ids } }, select: agentProfileSelect }),
        this.prisma.swipeLog.findMany({
          where: {
            user_id: userId,
            direction: { in: [SwipeDirection.LEFT, SwipeDirection.RIGHT] },
          },
          orderBy: { swiped_at: 'desc' },
          take: SWIPE_HISTORY,
          select: { direction: true, swiped_at: true, target: { select: agentProfileSelect } },
        }),
      ]);
      if (!me) return null;

      const byId = new Map(details.map((detail) => [detail.id, detail]));
      const body = JSON.stringify({
        me: toAgentProfile(me as AgentProfileRow),
        candidates: profiles.map((profile) => {
          const row = byId.get(profile.id) as AgentProfileRow | undefined;
          return {
            ...(row ? toAgentProfile(row) : { id: profile.id }),
            distance_km: profile.distance_km,
          };
        }),
        swipes: logs.map((log) => ({
          direction: log.direction === SwipeDirection.RIGHT ? 'like' : 'pass',
          at: log.swiped_at.toISOString(),
          profile: toAgentProfile(log.target as AgentProfileRow),
        })),
        radiusKm,
      });
      const data = await this.post(body);
      if (!data?.ok || !data.results) return null;

      const feed = new Map(profiles.map((profile) => [profile.id, profile]));
      const ranked: FeedProfile[] = [];
      for (const result of data.results) {
        const profile = feed.get(result.id);
        if (!profile) continue;
        ranked.push({
          ...profile,
          match_score: result.score,
          confidence: result.confidence,
          compatibility: result.dimensions.map((dimension) => ({
            dimension: DIMENSION_NAMES[dimension.key] ?? dimension.key,
            score: Math.round(dimension.score),
            weight: dimension.weight,
            contribution: Math.round(dimension.contribution),
          })),
        });
      }
      // Profiles the agents did not return keep their place at the end.
      const returned = new Set(data.results.map((result) => result.id));
      for (const profile of profiles) {
        if (!returned.has(profile.id)) ranked.push(profile);
      }
      // Boost (×3 with a presentation video, × the plan): the highlighted place, second card.
      const sponsoredIndex = ranked.findIndex((profile) => profile.id === data.sponsored);
      if (sponsoredIndex > 1) {
        const sponsored = ranked.splice(sponsoredIndex, 1)[0];
        if (sponsored) ranked.splice(1, 0, sponsored);
      }
      return ranked;
    } catch {
      return null;
    }
  }

  private async post(body: string): Promise<AgentsFeedResponse | null> {
    for (const base of candidateUrls(this.baseUrl)) {
      try {
        const response = await this.fetchImpl(`${base}/agents/feed`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal: AbortSignal.timeout(AGENTS_TIMEOUT_MS),
        });
        return response.ok ? ((await response.json()) as AgentsFeedResponse) : null;
      } catch {
        // Unreachable: try the next address, if any.
      }
    }
    return null;
  }
}
