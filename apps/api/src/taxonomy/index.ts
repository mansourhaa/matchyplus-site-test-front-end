import { ScoringProfile } from '../utils/matching-score.js';
import { CONCEPTS_CATALOG, FIELD_PRIORITIES, FORM_OPTIONS, TAXONOMY_LOOKUP } from './taxonomy-data.js';
import { ConceptDetail, ConceptLookupResult, FormOption, TaxonomyLanguage } from './taxonomy-types.js';

export * from './taxonomy-data.js';
export * from './taxonomy-types.js';

function norm(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Looks up normalized term directly in the taxonomy.
 */
export function lookupConcept(term: string): ConceptLookupResult[] {
  const normalized = norm(term);
  if (!normalized) return [];
  return TAXONOMY_LOOKUP[normalized] || [];
}

/**
 * Extracts all matching concepts from an arbitrary text or list of tokens.
 */
export function extractConceptsFromTokens(tokens: string[]): Map<string, { conceptId: string; sectorId: number; weight: number }> {
  const matched = new Map<string, { conceptId: string; sectorId: number; weight: number }>();

  for (const raw of tokens) {
    const normalized = norm(raw);
    if (!normalized) continue;

    // Direct lookup
    const direct = TAXONOMY_LOOKUP[normalized];
    if (direct && direct.length > 0) {
      for (const d of direct) {
        matched.set(d.conceptId, { conceptId: d.conceptId, sectorId: d.sectorId, weight: d.weight });
      }
      continue;
    }

    // Word tokens check if multiple words
    const words = normalized.split(/[\s/,]+/).filter((w) => w.length >= 3);
    for (const w of words) {
      const found = TAXONOMY_LOOKUP[w];
      if (found && found.length > 0) {
        for (const f of found) {
          if (!matched.has(f.conceptId)) {
            matched.set(f.conceptId, { conceptId: f.conceptId, sectorId: f.sectorId, weight: f.weight * 0.9 });
          }
        }
      }
    }
  }

  return matched;
}

/**
 * Extracts Demand Concepts (what the user is seeking / hiring / interested in).
 */
export function extractDemandConcepts(profile: ScoringProfile): Map<string, { conceptId: string; sectorId: number; weight: number }> {
  const tokens: string[] = [];
  if (profile.interests && Array.isArray(profile.interests)) {
    tokens.push(...profile.interests);
  }
  if (profile.looking_for) {
    tokens.push(...profile.looking_for.split(/[\s/,]+/));
  }
  return extractConceptsFromTokens(tokens);
}

/**
 * Extracts Supply Concepts (what the user provides, works as, or offers).
 */
export function extractSupplyConcepts(profile: ScoringProfile): Map<string, { conceptId: string; sectorId: number; weight: number }> {
  const tokens: string[] = [];
  if (profile.job) tokens.push(profile.job);
  if (profile.service_type) tokens.push(profile.service_type);
  if (profile.category) tokens.push(profile.category);
  if (profile.activity_sector) tokens.push(profile.activity_sector);
  if (profile.interests && Array.isArray(profile.interests)) {
    tokens.push(...profile.interests);
  }
  return extractConceptsFromTokens(tokens);
}

/**
 * Checks whether client demand matches provider supply using canonical concepts.
 */
export function matchDemandWithSupply(
  clientDemand: Map<string, { conceptId: string; sectorId: number; weight: number }>,
  providerSupply: Map<string, { conceptId: string; sectorId: number; weight: number }>,
): { matches: boolean; score: number; commonConcepts: string[]; sectorId?: number } {
  const common: string[] = [];
  let bestSectorId: number | undefined;

  for (const [conceptId, demand] of clientDemand.entries()) {
    if (providerSupply.has(conceptId)) {
      common.push(conceptId);
      bestSectorId = demand.sectorId;
    }
  }

  if (common.length > 0) {
    return {
      matches: true,
      score: 100,
      commonConcepts: common,
      sectorId: bestSectorId,
    };
  }

  return {
    matches: false,
    score: 0,
    commonConcepts: [],
  };
}

/**
 * Autocomplete tag search across French, English, Arabic, Tunisian Darija, Arabizi.
 */
export function searchTaxonomySuggestions(
  query: string,
  lang?: TaxonomyLanguage | string,
  limit = 10,
): { tag: string; conceptId: string; sectorId: number; lang: string }[] {
  const q = norm(query);
  if (!q || q.length < 2) return [];

  const results: { tag: string; conceptId: string; sectorId: number; lang: string }[] = [];
  const seenTags = new Set<string>();

  for (const [conceptId, detail] of Object.entries(CONCEPTS_CATALOG)) {
    for (const v of detail.variants) {
      if (lang && v.lang !== lang && lang !== 'all') continue;
      const vNorm = norm(v.tag);
      if (vNorm.includes(q) || q.includes(vNorm)) {
        if (!seenTags.has(v.tag)) {
          seenTags.add(v.tag);
          results.push({
            tag: v.tag,
            conceptId,
            sectorId: detail.sectorId,
            lang: v.lang,
          });
          if (results.length >= limit) return results;
        }
      }
    }
  }

  return results;
}
