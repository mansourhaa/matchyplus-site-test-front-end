import { describe, expect, it } from 'vitest';
import {
  extractConceptsFromTokens,
  extractSupplyConcepts,
  lookupConcept,
  matchDemandWithSupply,
  searchTaxonomySuggestions,
} from './index.js';
import { candidateMatchesInterests, computeMatchScore, ScoringProfile } from '../utils/matching-score.js';

describe('Taxonomy System (Matchy+ CSV Integration)', () => {
  it('correctly looks up concepts across multiple languages and dialects', () => {
    // French
    const frLookup = lookupConcept('vendeur');
    expect(frLookup.length).toBeGreaterThan(0);
    expect(frLookup[0].conceptId).toBe('S01-C01');

    // English
    const enLookup = lookupConcept('salesperson');
    expect(enLookup.length).toBeGreaterThan(0);
    expect(enLookup[0].conceptId).toBe('S01-C01');

    // Tunisian Arabizi
    const arabiziLookup = lookupConcept('bayya3');
    expect(arabiziLookup.length).toBeGreaterThan(0);
    expect(arabiziLookup[0].conceptId).toBe('S01-C01');

    // Standard Arabic
    const arLookup = lookupConcept('بائع');
    expect(arLookup.length).toBeGreaterThan(0);
    expect(arLookup[0].conceptId).toBe('S01-C01');
  });

  it('matches client demand with provider supply across languages using canonical concepts', () => {
    // Client wants delivery, searched in Arabic
    const clientDemand = extractConceptsFromTokens(['توصيل']);

    // Provider is a French delivery driver
    const providerSupply = extractSupplyConcepts({
      id: 'p1',
      job: 'Livreur',
      service_type: 'Chauffeur / Transport',
    });

    const match = matchDemandWithSupply(clientDemand, providerSupply);
    expect(match.matches).toBe(true);
    expect(match.score).toBe(100);
  });

  it('integrates seamlessly with candidateMatchesInterests in matching engine', () => {
    const deliveryProvider: ScoringProfile = {
      id: 'driver',
      profile_type: 'PROVIDER',
      job: 'Livreur',
      service_type: 'Chauffeur / Transport',
      activity_sector: 'transport_logistics',
    };

    // Client specifies interest in Arabizi or French or Arabic
    expect(candidateMatchesInterests(deliveryProvider, ['livraison'])).toBe(true);
    expect(candidateMatchesInterests(deliveryProvider, ['توصيل'])).toBe(true);
    expect(candidateMatchesInterests(deliveryProvider, ['chauffeur livraison'])).toBe(true);
  });

  it('provides multilingual autocomplete suggestions for search and onboarding', () => {
    const suggestions = searchTaxonomySuggestions('vend', 'fr', 5);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.tag.toLowerCase().includes('vend'))).toBe(true);
  });

  it('scores end-to-end cross-lingual match with high confidence and Group 1 tier', () => {
    const client: ScoringProfile = {
      id: 'client-ar',
      profile_type: 'INDIVIDUAL',
      interests: ['توصيل'],
      goals: ['Demander un service'],
      languages: ['ar', 'fr'],
    };

    const provider: ScoringProfile = {
      id: 'provider-fr',
      profile_type: 'PROVIDER',
      job: 'Livreur',
      service_type: 'Chauffeur / Transport',
      activity_sector: 'transport_logistics',
      languages: ['fr'],
      rating: 4.8,
      reviews: 15,
    };

    const result = computeMatchScore(client, provider, 3);
    expect(result.matchGroup).toBe(1);
    expect(result.confidence).toBe('high');
    expect(result.finalScore).toBeGreaterThanOrEqual(80);
  });
});
