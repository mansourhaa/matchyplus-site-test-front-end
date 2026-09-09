/**
 * Scripted 6-Dimension Discovery Matching Engine for Fastify API.
 * Aligned with Matchy+ specification (https://appmatchyplus.figma.site/matching-doc).
 *
 * Dimensions & Weights:
 * - 1. Compétences & Intérêts (28%)
 * - 2. Proximité géographique (22%)
 * - 3. Alignement des objectifs (18%)
 * - 4. Disponibilité partagée (12%)
 * - 5. Langues communes (10%)
 * - 6. Qualité & Réputation (10%)
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
  image?: string | null;
  activity_sector?: string | null;
  service_type?: string | null;
  job?: string | null;
  category?: string | null;
  profile_type?: string | null;
  languages?: string[] | null;
  availability_days?: string[] | null;
  availability_hours?: string[] | null;
  schedule?: string | null;
  rating?: number | null;
  reviews?: number | null;
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

export const WEIGHTS = {
  skills: 0.28,
  proximity: 0.22,
  goals: 0.18,
  availability: 0.12,
  languages: 0.1,
  quality: 0.1,
} as const;

/** Small boost when the candidate already liked me (incoming RIGHT). */
export const RECIPROCITY_BOOST = 8;

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

const LANG_MAP: Record<string, string> = {
  arabe: 'ar',
  arabic: 'ar',
  عربية: 'ar',
  'ar-dialect': 'ar',
  français: 'fr',
  french: 'fr',
  francais: 'fr',
  anglais: 'en',
  english: 'en',
  allemand: 'de',
  german: 'de',
  italien: 'it',
  italian: 'it',
  espagnol: 'es',
  spanish: 'es',
};

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
    .filter((w) => w.length >= 3);
  return [...new Set(fallback)];
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

/** 1. Compétences & Intérêts (28%): Jaccard + soft substring matches + sector alignment */
export function skillsScore(me: ScoringProfile, cand: ScoringProfile): number {
  const userTags = interestTokens(me);
  const candTags = interestTokens(cand);
  if (userTags.length === 0 || candTags.length === 0) return 40;

  let intersection = 0;
  for (const t of userTags) {
    if (candTags.includes(t)) intersection += 1;
  }
  const union = new Set([...userTags, ...candTags]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  const softMatches = userTags.filter((ut) =>
    candTags.some((pt) => pt.includes(ut) || ut.includes(pt)),
  ).length;

  const compatible = sectorsCompatible(sectorLabel(me), sectorLabel(cand));
  const sectorBoost = compatible ? 1.15 : 0.85;

  return Math.max(
    20,
    Math.min(100, Math.round((jaccard * 60 + softMatches * 8 + 15) * sectorBoost)),
  );
}

/** 2. Proximité géographique (22%): Exponential decay curve */
export function proximityScore(distKm: number | null, radiusKm = 100): number {
  if (distKm == null) return 50;
  if (distKm <= 0.5) return 99;
  const distRatio = Math.min(1, distKm / Math.max(1, radiusKm));
  const decay = Math.pow(Math.max(0, 1 - distRatio), 1.6) * 100;
  return Math.max(10, Math.min(100, Math.round(decay)));
}

/** 3. Alignement des objectifs (18%): Goal intent matrix */
export function goalsScore(
  me: ScoringProfile,
  cand: ScoringProfile,
): { score: number; matchType: MatchType } {
  const myIntents = extractIntents(me);
  const candIntents = extractIntents(cand);
  const meSect = sectorLabel(me);
  const candSect = sectorLabel(cand);
  const mutual = scoreMutualGoals(myIntents, candIntents, meSect, candSect);

  let score = 50;
  if (mutual.pts === 25) score = 100;
  else if (mutual.pts === 18) score = 90;
  else if (mutual.pts === 10) score = 75;
  else score = 45;

  return { score, matchType: mutual.matchType };
}

/** 4. Disponibilité partagée (12%): Days overlap + schedule flexibility */
export function availabilityScore(me: ScoringProfile, cand: ScoringProfile): number {
  const myDays = me.availability_days ?? [];
  const candDays = cand.availability_days ?? [];
  const candSchedule = String(cand.schedule || '').toLowerCase();
  const isFlexible = /flexible|24h|disponible|plein temps|full-time/i.test(candSchedule);

  if (myDays.length > 0 && candDays.length > 0) {
    const dayOverlap = myDays.filter((d) => candDays.includes(d)).length;
    const dayScore = Math.min(100, (dayOverlap / Math.max(myDays.length, 1)) * 100);
    const hourScore = isFlexible ? 100 : 70;
    return Math.round(dayScore * 0.6 + hourScore * 0.4);
  }

  if (isFlexible) return 90;
  if (candDays.length > 0 || myDays.length > 0) return 70;
  return 65;
}

/** 5. Langues communes (10%): Normalized language overlap + shared bonus */
export function languageScore(me: ScoringProfile, cand: ScoringProfile): number {
  const normalize = (langs?: string[] | null) =>
    (langs || []).map((l) => LANG_MAP[norm(l)] ?? norm(l)).filter(Boolean);

  const myNorm = normalize(me.languages);
  const candNorm = normalize(cand.languages);

  if (myNorm.length === 0 || candNorm.length === 0) return 70;

  const shared = myNorm.filter((l) => candNorm.includes(l));
  const union = new Set([...myNorm, ...candNorm]).size;

  const jaccard = union > 0 ? shared.length / union : 0;
  const bonus = shared.length > 0 ? 15 : 0;
  return Math.min(100, Math.round(jaccard * 85 + bonus));
}

/** 6. Qualité & Réputation (10%): Rating + reviews log + completeness */
export function qualityScore(cand: ScoringProfile): number {
  const rating = cand.rating ?? 0;
  const reviews = cand.reviews ?? 0;

  const ratingScore = rating > 0 ? (Math.min(5, Math.max(0, rating)) / 5) * 70 : 45;
  const reviewBonus = Math.min(30, Math.log10(Math.max(0, reviews) + 1) * 30);
  const profileCompleteness = (cand.bio ? 5 : 0) + (cand.image ? 5 : 0);

  const score = ratingScore + reviewBonus + profileCompleteness;
  return Math.max(30, Math.min(100, Math.round(score)));
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
  options?: { likedMe?: boolean; radiusKm?: number },
): MatchScoreResult {
  const goals = goalsScore(me, cand);
  const skills = skillsScore(me, cand);
  const proximity = proximityScore(distKm, options?.radiusKm ?? 100);
  const availability = availabilityScore(me, cand);
  const languages = languageScore(me, cand);
  const quality = qualityScore(cand);

  const dimensions = [
    { label: 'skills', score: skills, weight: WEIGHTS.skills },
    { label: 'proximity', score: proximity, weight: WEIGHTS.proximity },
    { label: 'goals', score: goals.score, weight: WEIGHTS.goals },
    { label: 'availability', score: availability, weight: WEIGHTS.availability },
    { label: 'languages', score: languages, weight: WEIGHTS.languages },
    { label: 'quality', score: quality, weight: WEIGHTS.quality },
  ];

  const rawWeighted = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);

  // Deterministic seed jitter (±3 pts) to avoid visual ties across re-renders
  const seed = (cand.id.charCodeAt(0) || 0) + (cand.interests?.length || 0);
  const jitter = (seed % 7) - 3;

  const reciprocityBoost = options?.likedMe ? RECIPROCITY_BOOST : 0;
  const clampedBase = Math.min(99, Math.max(40, Math.round(rawWeighted + jitter)));
  const finalScore = Math.min(100, clampedBase + reciprocityBoost);

  let matchType = goals.matchType;
  let matchGroup = groupFor(matchType);
  const myIntents = extractIntents(me);
  const meSect = sectorLabel(me);
  const candSect = sectorLabel(cand);
  const strict = myIntents.some((i) => SECTOR_STRICT.has(i)) && Boolean(norm(meSect));
  if (strict && !sectorsCompatible(meSect, candSect) && matchType === 'none') {
    matchType = 'none';
    matchGroup = 4;
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
