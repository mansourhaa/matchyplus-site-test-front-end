/**
 * Scripted Discovery scoring (v5 port) for Fastify product API.
 *
 * - No Ollama / embeddings — those belong to apps/ai MATCH/EMBED jobs later.
 * - Interest score uses Jaccard (overlap / union), not raw tag count spam.
 * - Sector-strict intents demote cross-sector candidates to suggestions
 *   instead of dropping them entirely.
 */

export type MatchIntent =
  | 'find_job'
  | 'recruit'
  | 'offer_service'
  | 'need_service'
  | 'invest'
  | 'seek_investment'
  | 'partnership'
  | 'networking';

export type MatchGroup = 1 | 2 | 3 | 4;
export type MatchType = 'strong' | 'domain' | 'same_intent' | 'none';
export type MatchConfidence = 'high' | 'medium' | 'low';

export type ScoringProfile = {
  id: string;
  interests?: string[] | null;
  goals?: string[] | null;
  looking_for?: string | null;
  bio?: string | null;
  activity_sector?: string | null;
  service_type?: string | null;
  job?: string | null;
  category?: string | null;
  profile_type?: string | null;
};

export type ScoreBreakdown = {
  dimension: string;
  score: number;
  weight: number;
  contribution: number;
};

export type MatchScoreResult = {
  finalScore: number;
  sortScore: number;
  confidence: MatchConfidence;
  matchType: MatchType;
  matchTypeLabel: string;
  matchGroup: MatchGroup;
  breakdown: ScoreBreakdown[];
  reciprocityBoost: number;
};

const INTENT_KEYWORDS: Record<MatchIntent, string[]> = {
  find_job: ['job', 'emploi', 'stage', 'find job', 'candidat', 'cdi', 'cdd', 'mission'],
  recruit: ['recruter', 'recruit', 'hire', 'embauche', 'cherche profil'],
  offer_service: ['proposer mes services', 'prestataire', 'offer service', 'je propose'],
  need_service: ['demander un service', 'need service', 'trouver un prestataire', 'besoin'],
  invest: ['investir', 'invest', 'business angel', 'financer'],
  seek_investment: ['lever des fonds', 'seek investment', 'cherche financement', 'investisseur'],
  partnership: ['partenaire', 'partnership', 'collaboration', 'associé'],
  networking: ['réseau', 'network', 'networking', 'rencontrer', 'échanger'],
};

const GOAL_OPTION_TO_INTENT: Record<string, MatchIntent> = {
  'trouver un job': 'find_job',
  "recruter quelqu'un": 'recruit',
  'proposer mes services': 'offer_service',
  'travailler comme prestataire': 'need_service',
  'demander un service': 'need_service',
  'collaborer sur un projet': 'invest',
  'découvrir des idées et opportunités': 'invest',
  'trouver un partenaire': 'seek_investment',
  'développer une activité': 'seek_investment',
  'trouver un prestataire': 'need_service',
  'rencontrer des personnes près de moi': 'networking',
  "chercher l'inspiration": 'networking',
};

const INTENT_COMPLEMENTS: Record<MatchIntent, { strong: MatchIntent[]; domain: MatchIntent[] }> = {
  find_job: { strong: ['recruit'], domain: ['find_job', 'offer_service'] },
  recruit: { strong: ['find_job', 'offer_service'], domain: ['recruit'] },
  offer_service: { strong: ['need_service'], domain: ['offer_service', 'find_job'] },
  need_service: { strong: ['offer_service'], domain: ['need_service'] },
  invest: { strong: ['seek_investment'], domain: ['invest'] },
  seek_investment: { strong: ['invest'], domain: ['seek_investment', 'partnership'] },
  partnership: { strong: ['partnership'], domain: ['seek_investment', 'networking'] },
  networking: { strong: ['networking'], domain: ['networking', 'find_job', 'offer_service'] },
};

const SECTOR_STRICT = new Set<MatchIntent>([
  'find_job',
  'recruit',
  'offer_service',
  'need_service',
]);

const WEIGHTS = {
  sector: 0.28,
  goals: 0.3,
  interests: 0.17,
  geo: 0.17,
  service_type: 0.08,
} as const;

/** Small boost when the candidate already liked me (incoming RIGHT). */
export const RECIPROCITY_BOOST = 8;

function norm(value: string | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function sectorLabel(profile: ScoringProfile): string {
  return (
    profile.activity_sector ||
    profile.category ||
    profile.service_type ||
    profile.job ||
    ''
  ).trim();
}

export function extractIntents(profile: ScoringProfile): MatchIntent[] {
  const intents: MatchIntent[] = [];
  for (const goal of profile.goals || []) {
    const mapped = GOAL_OPTION_TO_INTENT[norm(goal)];
    if (mapped && !intents.includes(mapped)) intents.push(mapped);
  }
  if (intents.length === 0) {
    const haystack = `${norm(profile.looking_for)} ${norm(profile.bio)}`;
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [MatchIntent, string[]][]) {
      if (keywords.some((kw) => haystack.includes(norm(kw)))) {
        intents.push(intent);
      }
    }
  }
  if (intents.length === 0) {
    const type = norm(profile.profile_type);
    intents.push(
      ['employeur', 'company', 'business', 'pro'].includes(type) ? 'recruit' : 'networking',
    );
  }
  return intents;
}

function interestTokens(profile: ScoringProfile): string[] {
  const fromList = (profile.interests || []).map((s) => norm(s)).filter(Boolean);
  if (fromList.length) return [...new Set(fromList)];
  const fallback = [sectorLabel(profile), profile.service_type || '', profile.job || '']
    .join(' ')
    .toLowerCase()
    .split(/[\s/,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4);
  return [...new Set(fallback)];
}

/** Jaccard similarity × 100 — spam-resistant vs raw overlap count. */
export function interestJaccardScore(me: ScoringProfile, cand: ScoringProfile): number {
  const a = new Set(interestTokens(me));
  const b = new Set(interestTokens(cand));
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  const union = a.size + b.size - overlap;
  return Math.round((overlap / union) * 100);
}

function sectorsCompatible(meSect: string, candSect: string): boolean {
  const a = norm(meSect);
  const b = norm(candSect);
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

function scoreMutualGoals(
  myIntents: MatchIntent[],
  candIntents: MatchIntent[],
  meSect: string,
  candSect: string,
): { pts: number; matchType: MatchType } {
  let strong = false;
  let domain = false;
  let same = false;
  const compatible = sectorsCompatible(meSect, candSect);
  const sameSect = Boolean(norm(meSect) && norm(candSect) && compatible);

  for (const myIntent of myIntents) {
    const complements = INTENT_COMPLEMENTS[myIntent];
    for (const candIntent of candIntents) {
      if (complements.strong.includes(candIntent)) {
        if ((SECTOR_STRICT.has(myIntent) || SECTOR_STRICT.has(candIntent)) && !compatible) {
          continue;
        }
        strong = true;
      } else if (complements.domain.includes(candIntent) && sameSect) {
        domain = true;
      } else if (myIntent === candIntent) {
        if (SECTOR_STRICT.has(myIntent) && !compatible) continue;
        same = true;
      }
    }
  }

  if (strong) return { pts: 25, matchType: 'strong' };
  if (domain) return { pts: 18, matchType: 'domain' };
  if (same) return { pts: 10, matchType: 'same_intent' };
  return { pts: 0, matchType: 'none' };
}

function geoScore(distKm: number | null): number {
  if (distKm == null) return 40;
  if (distKm <= 2) return 95;
  if (distKm <= 5) return 85;
  if (distKm <= 15) return 72;
  if (distKm <= 30) return 58;
  return 45;
}

function sectorScore(me: ScoringProfile, cand: ScoringProfile): number {
  const meSect = sectorLabel(me);
  const candSect = sectorLabel(cand);
  if (!meSect && !candSect) return 40;
  if (sectorsCompatible(meSect, candSect)) return 90;
  return 25;
}

function serviceTypeScore(me: ScoringProfile, cand: ScoringProfile): number {
  const a = norm(me.service_type || me.job);
  const b = norm(cand.service_type || cand.job);
  if (!a || !b) return 40;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 75;
  return 30;
}

function goalsToScore(pts: number): number {
  if (pts === 25) return 100;
  if (pts === 18) return 90;
  if (pts === 10) return 75;
  return 40;
}

function labelFor(matchType: MatchType): string {
  if (matchType === 'strong') return 'Profil complémentaire';
  if (matchType === 'domain') return 'Même domaine pro';
  if (matchType === 'same_intent') return 'Réseau professionnel';
  return 'Suggestion';
}

function groupFor(matchType: MatchType): MatchGroup {
  if (matchType === 'strong') return 1;
  if (matchType === 'domain') return 2;
  if (matchType === 'same_intent') return 3;
  return 4;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeMatchScore(
  me: ScoringProfile,
  cand: ScoringProfile,
  distKm: number | null,
  options?: { likedMe?: boolean },
): MatchScoreResult {
  const myIntents = extractIntents(me);
  const candIntents = extractIntents(cand);
  const meSect = sectorLabel(me);
  const candSect = sectorLabel(cand);
  const goals = scoreMutualGoals(myIntents, candIntents, meSect, candSect);

  const dimensions = [
    { label: 'sector', score: sectorScore(me, cand), weight: WEIGHTS.sector },
    { label: 'goals', score: goalsToScore(goals.pts), weight: WEIGHTS.goals },
    { label: 'interests', score: interestJaccardScore(me, cand), weight: WEIGHTS.interests },
    { label: 'geo', score: geoScore(distKm), weight: WEIGHTS.geo },
    {
      label: 'service_type',
      score: serviceTypeScore(me, cand),
      weight: WEIGHTS.service_type,
    },
  ];

  let finalScore = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0));
  const reciprocityBoost = options?.likedMe ? RECIPROCITY_BOOST : 0;
  finalScore = Math.min(100, finalScore + reciprocityBoost);

  // Cross-sector under sector-strict intents: keep as low-priority suggestion, do not drop.
  let matchType = goals.matchType;
  let matchGroup = groupFor(matchType);
  const strict = myIntents.some((i) => SECTOR_STRICT.has(i)) && Boolean(norm(meSect));
  if (strict && !sectorsCompatible(meSect, candSect) && matchType === 'none') {
    matchType = 'none';
    matchGroup = 4;
    finalScore = Math.min(finalScore, 45);
  }

  return {
    finalScore,
    sortScore: finalScore,
    confidence: finalScore >= 75 ? 'high' : finalScore >= 55 ? 'medium' : 'low',
    matchType,
    matchTypeLabel: labelFor(matchType),
    matchGroup,
    reciprocityBoost,
    breakdown: dimensions.map((d) => ({
      dimension: d.label,
      score: d.score,
      weight: d.weight,
      contribution: Math.round(d.score * d.weight),
    })),
  };
}
