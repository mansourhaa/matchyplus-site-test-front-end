/**
 * Scripted 7-Dimension Discovery Matching Engine for Fastify API.
 * Aligned with Matchy+ specifications.
 *
 * Dimensions & Weights:
 * - 1. Secteur d'activité & Type de service (30%)
 * - 2. Complémentarité des rôles (INDIVIDUAL <-> PROVIDER) (20%)
 * - 3. Intérêts partagés & Objectifs mutuels (15%)
 * - 4. Proximité géographique (15%)
 * - 5. Disponibilité & Modes de contact (10%)
 * - 6. Qualité, note & réputation du profil (5%)
 * - 7. Compatibilité budget / tarif (5%)
 * Total = 100%
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
  contact_modes?: string[] | null;
  price?: string | null;
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
  sector: 0.3,
  roles: 0.2,
  goals: 0.15,
  proximity: 0.15,
  availability: 0.1,
  quality: 0.05,
  budget: 0.05,
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
      ['employeur', 'company', 'business', 'pro', 'provider'].includes(type)
        ? 'recruit'
        : 'networking',
    );
  }
  return intents;
}

import {
  extractConceptsFromTokens,
  extractSupplyConcepts,
  matchDemandWithSupply,
} from '../taxonomy/index.js';

export function candidateMatchesInterests(cand: ScoringProfile, interests: string[]): boolean {
  // 1. Fast taxonomy concept match (cross-lingual, dialect-aware)
  try {
    const demand = extractConceptsFromTokens(interests);
    const supply = extractSupplyConcepts(cand);
    const taxonomyMatch = matchDemandWithSupply(demand, supply);
    if (taxonomyMatch.matches) {
      return true;
    }
  } catch {
    // Graceful fallback to heuristic tokens
  }

  // 2. Fallback heuristic string / token match for custom non-taxonomy terms
  const candTargets = [
    cand.category,
    cand.service_type,
    cand.job,
    cand.activity_sector,
    ...(cand.interests || []),
  ]
    .map(norm)
    .filter(Boolean);

  for (const interest of interests) {
    const target = norm(interest);
    if (!target) continue;

    for (const candField of candTargets) {
      if (candField === target) {
        return true;
      }
      if (candField.length >= 4 && target.length >= 4) {
        if (candField.includes(target) || target.includes(candField)) {
          return true;
        }
      }
      const targetWords = target.split(/[\s/,]+/).filter((w) => w.length >= 3);
      const candWords = candField.split(/[\s/,]+/).filter((w) => w.length >= 3);
      if (
        targetWords.some((tw) =>
          candWords.some(
            (cw) =>
              cw === tw ||
              (cw.length >= 4 && tw.length >= 4 && (cw.includes(tw) || tw.includes(cw))),
          ),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function interestTokens(profile: ScoringProfile): string[] {
  const fromList = (profile.interests || []).map((s) => norm(s)).filter(Boolean);
  const fromJobAndSector = [
    sectorLabel(profile),
    profile.category || '',
    profile.service_type || '',
    profile.job || '',
  ]
    .join(' ')
    .toLowerCase()
    .split(/[\s/,]+/)
    .map((w) => norm(w))
    .filter((w) => w.length >= 3);
  return [...new Set([...fromList, ...fromJobAndSector])];
}

function sectorsCompatible(
  meSect: string,
  candSect: string,
  me?: ScoringProfile,
  cand?: ScoringProfile,
): boolean {
  const a = norm(meSect);
  const b = norm(candSect);
  if (!a || !b) return true;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  if (me?.interests && cand && candidateMatchesInterests(cand, me.interests)) {
    return true;
  }

  return false;
}

function scoreMutualGoals(
  myIntents: MatchIntent[],
  candIntents: MatchIntent[],
  meSect: string,
  candSect: string,
  me?: ScoringProfile,
  cand?: ScoringProfile,
): { pts: number; matchType: MatchType } {
  let strong = false;
  let domain = false;
  let same = false;
  const compatible = sectorsCompatible(meSect, candSect, me, cand);
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

/** 1. Secteur d'activité & Service (30%): Exact or compatible sector/service alignment */
export function sectorScore(me: ScoringProfile, cand: ScoringProfile): number {
  const meType = norm(me.profile_type);
  const isMeIndividual =
    meType.includes('individual') || meType.includes('particulier') || meType.includes('candidat');
  const myIntents = extractIntents(me);
  const isSeekingService = isMeIndividual || myIntents.includes('need_service');

  // Case 1: When user is an individual / client seeking services and has specified interests
  if (isSeekingService && me.interests && me.interests.length > 0) {
    if (candidateMatchesInterests(cand, me.interests)) {
      return 100;
    }
    return 20;
  }

  const meSector = norm(sectorLabel(me));
  const candSector = norm(sectorLabel(cand));
  if (!meSector || !candSector) return 50;

  const meService = norm(me.service_type || me.job);
  const candService = norm(cand.service_type || cand.job);

  if (
    meService &&
    candService &&
    (meService === candService ||
      meService.includes(candService) ||
      candService.includes(meService))
  ) {
    return 100;
  }

  if (meSector === candSector || meSector.includes(candSector) || candSector.includes(meSector)) {
    return 90;
  }

  const meWords = meSector.split(/[\s/,]+/).filter((w) => w.length >= 3);
  const candWords = candSector.split(/[\s/,]+/).filter((w) => w.length >= 3);
  const wordMatch = meWords.some((w) => candWords.some((cw) => cw.includes(w) || w.includes(cw)));
  if (wordMatch) return 75;

  return 20;
}

/** 2. Complémentarité des rôles (20%): INDIVIDUAL vs PROVIDER */
export function rolesScore(me: ScoringProfile, cand: ScoringProfile): number {
  const meType = norm(me.profile_type);
  const candType = norm(cand.profile_type);

  const isMeIndividual =
    meType.includes('individual') || meType.includes('particulier') || meType.includes('candidat');
  const isMeProvider =
    meType.includes('provider') ||
    meType.includes('prestataire') ||
    meType.includes('pro') ||
    meType.includes('employeur');
  const isCandIndividual =
    candType.includes('individual') ||
    candType.includes('particulier') ||
    candType.includes('candidat');
  const isCandProvider =
    candType.includes('provider') ||
    candType.includes('prestataire') ||
    candType.includes('pro') ||
    candType.includes('employeur');

  if ((isMeIndividual && isCandProvider) || (isMeProvider && isCandIndividual)) {
    return 100; // Perfect complementary match
  }

  if (isMeProvider && isCandProvider) {
    return 65; // Peer / B2B partnership
  }

  if (isMeIndividual && isCandIndividual) {
    return 45;
  }

  return 70; // Default when roles not specified
}

/** 3. Compétences & Intérêts: Jaccard + soft matches */
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

  const compatible = sectorsCompatible(sectorLabel(me), sectorLabel(cand), me, cand);
  const sectorBoost = compatible ? 1.15 : 0.85;

  return Math.max(
    20,
    Math.min(100, Math.round((jaccard * 60 + softMatches * 8 + 15) * sectorBoost)),
  );
}

/** 3. Intérêts partagés & Objectifs mutuels (15%) */
export function goalsScore(
  me: ScoringProfile,
  cand: ScoringProfile,
): { score: number; matchType: MatchType } {
  const myIntents = extractIntents(me);
  const candIntents = extractIntents(cand);
  const meSect = sectorLabel(me);
  const candSect = sectorLabel(cand);
  const mutual = scoreMutualGoals(myIntents, candIntents, meSect, candSect, me, cand);
  const skills = skillsScore(me, cand);

  let baseIntentScore = 50;
  if (mutual.pts === 25) baseIntentScore = 100;
  else if (mutual.pts === 18) baseIntentScore = 85;
  else if (mutual.pts === 10) baseIntentScore = 70;
  else baseIntentScore = 35;

  const combined = Math.round(baseIntentScore * 0.5 + skills * 0.5);
  return { score: Math.max(20, Math.min(100, combined)), matchType: mutual.matchType };
}

/** 4. Proximité géographique (15%): Exponential decay curve */
export function proximityScore(distKm: number | null | undefined, radiusKm = 100): number {
  if (distKm == null || !Number.isFinite(distKm)) return 50;
  if (distKm <= 0.5) return 99;
  const distRatio = Math.min(1, Math.max(0, distKm) / Math.max(1, radiusKm));
  const decay = Math.pow(Math.max(0, 1 - distRatio), 1.6) * 100;
  return Math.max(10, Math.min(100, Math.round(decay)));
}

/** 5. Disponibilité & Modes de contact (10%) */
export function availabilityScore(me: ScoringProfile, cand: ScoringProfile): number {
  const myDays = me.availability_days ?? [];
  const candDays = cand.availability_days ?? [];
  const candSchedule = String(cand.schedule || '').toLowerCase();
  const isFlexible = /flexible|24h|disponible|plein temps|full-time/i.test(candSchedule);

  let dayScore = 65;
  if (myDays.length > 0 && candDays.length > 0) {
    const dayOverlap = myDays.filter((d) => candDays.includes(d)).length;
    dayScore = Math.min(100, (dayOverlap / Math.max(myDays.length, 1)) * 100);
  } else if (isFlexible) {
    dayScore = 90;
  }

  const myModes = me.contact_modes ?? [];
  const candModes = cand.contact_modes ?? [];
  let modeScore = 70;
  if (myModes.length > 0 && candModes.length > 0) {
    const overlap = myModes.filter((m) => candModes.includes(m)).length;
    modeScore = overlap > 0 ? 95 : 50;
  }

  return Math.round(dayScore * 0.6 + modeScore * 0.4);
}

/** Common languages evaluation */
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

/** 6. Qualité & Réputation (5%) */
export function qualityScore(cand: ScoringProfile): number {
  const rating = cand.rating ?? 0;
  const reviews = cand.reviews ?? 0;

  const ratingScore = rating > 0 ? (Math.min(5, Math.max(0, rating)) / 5) * 70 : 45;
  const reviewBonus = Math.min(30, Math.log10(Math.max(0, reviews) + 1) * 30);
  const profileCompleteness = (cand.bio ? 5 : 0) + (cand.image ? 5 : 0);

  const score = ratingScore + reviewBonus + profileCompleteness;
  return Math.max(30, Math.min(100, Math.round(score)));
}

function parsePriceNumber(price?: string | null): number | null {
  if (!price) return null;
  const match = price.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const val = parseFloat(match[0].replace(',', '.'));
  return Number.isFinite(val) ? val : null;
}

/** 7. Compatibilité budget / tarif (5%) */
export function budgetScore(me: ScoringProfile, cand: ScoringProfile): number {
  const p1 = parsePriceNumber(me.price);
  const p2 = parsePriceNumber(cand.price);
  if (p1 == null || p2 == null) return 75; // Neutral when price not specified

  const ratio = Math.min(p1, p2) / Math.max(p1, p2, 1);
  return Math.max(30, Math.min(100, Math.round(ratio * 100)));
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

/**
 * Calculates great-circle distance between two points in km.
 * Returns null if any coordinate is missing, null, undefined, or NaN.
 */
export function haversineKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined,
): number | null {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(Math.max(0, 1 - a)));
  const d = R * c;
  return Number.isFinite(d) ? Math.round(d * 10) / 10 : null;
}

export function computeMatchScore(
  me: ScoringProfile,
  cand: ScoringProfile,
  distKm: number | null | undefined,
  options?: { likedMe?: boolean; radiusKm?: number },
): MatchScoreResult {
  const safeDistKm = distKm != null && Number.isFinite(distKm) ? distKm : null;

  const sector = sectorScore(me, cand);
  const roles = rolesScore(me, cand);
  const goals = goalsScore(me, cand);
  const proximity = proximityScore(safeDistKm, options?.radiusKm ?? 100);
  const availability = availabilityScore(me, cand);
  const quality = qualityScore(cand);
  const budget = budgetScore(me, cand);
  const skills = skillsScore(me, cand);
  const languages = languageScore(me, cand);

  // Background dimensions strictly used by the matching engine algorithm
  const backgroundDimensions = [
    { label: 'sector', score: sector, weight: WEIGHTS.sector },
    { label: 'roles', score: roles, weight: WEIGHTS.roles },
    { label: 'goals', score: goals.score, weight: WEIGHTS.goals },
    { label: 'proximity', score: proximity, weight: WEIGHTS.proximity },
    { label: 'availability', score: availability, weight: WEIGHTS.availability },
    { label: 'quality', score: quality, weight: WEIGHTS.quality },
    { label: 'budget', score: budget, weight: WEIGHTS.budget },
  ];

  const rawWeighted = backgroundDimensions.reduce((sum, d) => sum + d.score * d.weight, 0);

  // Deterministic seed jitter (±2 pts) to avoid visual ties across re-renders
  const seed = (cand.id.charCodeAt(0) || 0) + (cand.interests?.length || 0);
  const jitter = (seed % 5) - 2;

  const reciprocityBoost = options?.likedMe ? RECIPROCITY_BOOST : 0;
  let clampedBase = Math.min(99, Math.max(30, Math.round(rawWeighted + jitter)));
  if (sector < 30) {
    clampedBase = Math.min(50, clampedBase);
  }
  const finalScore = Math.min(100, clampedBase + reciprocityBoost);

  let matchType = goals.matchType;
  if ((goals.matchType === 'strong' || roles === 100) && sector >= 70) {
    matchType = 'strong';
  } else if (goals.matchType === 'domain' || sector >= 75) {
    matchType = 'domain';
  } else if (goals.matchType === 'same_intent' || sector >= 50) {
    matchType = 'same_intent';
  } else if (sector < 30) {
    matchType = 'none';
  }

  let matchGroup = groupFor(matchType);
  if (sector < 30) {
    matchGroup = 4;
  }

  // User-facing 6-dimension breakdown surfaced in the UI.
  // Sector, roles, and budget stay background-only and are not exposed.
  const userFacingDimensions: ScoreBreakdown[] = [
    { dimension: 'skills', score: skills, weight: 0.28, contribution: Math.round(skills * 0.28) },
    { dimension: 'proximity', score: proximity, weight: 0.22, contribution: Math.round(proximity * 0.22) },
    { dimension: 'goals', score: goals.score, weight: 0.18, contribution: Math.round(goals.score * 0.18) },
    { dimension: 'availability', score: availability, weight: 0.12, contribution: Math.round(availability * 0.12) },
    { dimension: 'languages', score: languages, weight: 0.10, contribution: Math.round(languages * 0.10) },
    { dimension: 'quality', score: quality, weight: 0.10, contribution: Math.round(quality * 0.10) },
  ];

  return {
    finalScore,
    sortScore: finalScore,
    confidence: finalScore >= 75 ? 'high' : finalScore >= 55 ? 'medium' : 'low',
    matchType,
    matchTypeLabel: labelFor(matchType),
    matchGroup,
    reciprocityBoost,
    breakdown: userFacingDimensions,
  };
}
