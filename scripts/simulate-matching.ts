import { computeMatchScore, ScoringProfile } from '../apps/api/src/utils/matching-score.js';

// 1. You: A Software Engineer looking for delivery services
const me: ScoringProfile = {
  id: 'me-software-eng',
  profile_type: 'INDIVIDUAL',
  job: 'Software Engineer',
  activity_sector: 'tech_digital',
  category: 'Informatique / Tech',
  interests: ['deliveries', 'livraison'],
  goals: ['Demander un service', 'trouver un prestataire'],
  languages: ['fr', 'en', 'ar'],
};

// 2. Candidate A: A Delivery Courier / Driver (3 km away)
const candidateDelivery: ScoringProfile = {
  id: 'cand-delivery',
  profile_type: 'PROVIDER',
  job: 'Livreur Express',
  service_type: 'Chauffeur / Transport',
  activity_sector: 'transport_logistics',
  category: 'Transport & Livraison',
  interests: ['livraison', 'coursier', 'transport'],
  goals: ['Proposer mes services', 'travailler comme prestataire'],
  languages: ['fr', 'ar'],
  rating: 4.9,
  reviews: 35,
};

// 3. Candidate B: Another Software Engineer (Nearby, 2 km away)
const candidateDev: ScoringProfile = {
  id: 'cand-dev',
  profile_type: 'INDIVIDUAL',
  job: 'Full Stack Web Developer',
  service_type: 'Informatique / Tech',
  activity_sector: 'tech_digital',
  category: 'Informatique / Tech',
  interests: ['react', 'node', 'ai'],
  goals: ['Trouver un job'],
  languages: ['fr', 'en'],
  rating: 5.0,
  reviews: 12,
};

// 4. Candidate C: Housemaid / Cleaner (Nearby, 2.5 km away)
const candidateCleaner: ScoringProfile = {
  id: 'cand-cleaner',
  profile_type: 'PROVIDER',
  job: 'Aide ménagère',
  service_type: 'Service à domicile',
  activity_sector: 'local_services_trades',
  category: 'Ménage',
  interests: ['nettoyage', 'maison'],
  goals: ['Proposer mes services'],
  languages: ['fr', 'ar'],
  rating: 4.8,
  reviews: 28,
};

console.log('=================================================================');
console.log('MATCHING SIMULATION: Software Engineer seeking "deliveries"');
console.log('=================================================================\n');

const candidates = [
  { name: 'Sami (Livreur Express)', profile: candidateDelivery, distKm: 3 },
  { name: 'Yassine (Full Stack Web Developer)', profile: candidateDev, distKm: 2 },
  { name: 'Fatima (Aide ménagère)', profile: candidateCleaner, distKm: 2.5 },
];

const results = candidates.map(({ name, profile, distKm }) => {
  const score = computeMatchScore(me, profile, distKm);
  return { name, profile, distKm, score };
});

results.sort((a, b) => {
  if (a.score.matchGroup !== b.score.matchGroup) {
    return a.score.matchGroup - b.score.matchGroup;
  }
  return b.score.finalScore - a.score.finalScore;
});

results.forEach((r, idx) => {
  console.log(`Rank #${idx + 1}: ${r.name}`);
  console.log(`   Final Score: ${r.score.finalScore}% (Confidence: ${r.score.confidence})`);
  console.log(`   Match Group: Group ${r.score.matchGroup} (${r.score.matchTypeLabel})`);
  console.log('   6-Dimension Breakdown (UI):');
  r.score.breakdown.forEach((dim) => {
    console.log(`      - ${dim.dimension.padEnd(14)}: ${dim.score}%`);
  });
  console.log('-----------------------------------------------------------------');
});

