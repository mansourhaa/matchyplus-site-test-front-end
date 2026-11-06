/**
 * Moteur d'IA de matching Matchy+
 * Scoring multi-dimensionnel en temps réel avec apprentissage comportemental
 */

import type { Profile } from "../components/profileData";
import type { RegistrationData } from "../context/RegistrationContext";

/* ─── Score breakdown ─── */
export interface ScoreDimension {
  key: string;
  label: string;       // FR
  labelEn: string;     // EN
  labelAr: string;     // AR
  score: number;       // 0–100 (normalized per-dimension)
  weight: number;      // contribution weight
  icon: string;        // emoji
  reason: string;      // FR explanation
  reasonEn: string;
  reasonAr: string;
}

export interface MatchResult {
  profileId: number;
  totalScore: number;         // 0–100
  confidence: "high" | "medium" | "low";
  dimensions: ScoreDimension[];
  highlights: string[];       // top 3 reasons (FR)
  highlightsEn: string[];
  highlightsAr: string[];
  computedAt: number;         // timestamp
  rankPosition: number;       // position in sorted queue
}

/* ─── Preference vector (behavioral learning) ─── */
export interface PreferenceVector {
  categoryWeights: Record<string, number>;  // multipliers per category
  swipeHistory: Array<{ profileId: number; direction: "left" | "right"; timestamp: number }>;
  interactionCount: number;
}

const STORAGE_KEY = "matchy_ai_prefs";
const DEFAULT_PREFS: PreferenceVector = {
  categoryWeights: {},
  swipeHistory: [],
  interactionCount: 0,
};

/* ─── Load / Save preference vector ─── */
export function loadPreferences(): PreferenceVector {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS };
}

export function savePreferences(prefs: PreferenceVector) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

/* ─── Record a swipe (behavioral signal) ─── */
export function recordSwipe(
  prefs: PreferenceVector,
  profile: Profile,
  direction: "left" | "right"
): PreferenceVector {
  const w = prefs.categoryWeights[profile.category] ?? 1.0;
  const delta = direction === "right" ? 0.12 : -0.06;
  const newWeight = Math.max(0.3, Math.min(2.0, w + delta));

  // Also boost/reduce tag-level weights in the category
  const tagBoost = direction === "right" ? 0.05 : -0.02;
  const tagWeights = { ...prefs.categoryWeights };
  profile.tags.forEach((tag) => {
    tagWeights[`tag:${tag.toLowerCase()}`] = Math.max(
      0.3,
      Math.min(2.0, (tagWeights[`tag:${tag.toLowerCase()}`] ?? 1.0) + tagBoost)
    );
  });

  const updated: PreferenceVector = {
    categoryWeights: {
      ...prefs.categoryWeights,
      ...tagWeights,
      [profile.category]: newWeight,
    },
    swipeHistory: [
      { profileId: profile.id, direction, timestamp: Date.now() },
      ...prefs.swipeHistory.slice(0, 49), // keep last 50
    ],
    interactionCount: prefs.interactionCount + 1,
  };
  savePreferences(updated);
  return updated;
}

/* ─── Utility: Jaccard similarity between two tag arrays ─── */
function jaccardSim(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const aSet = new Set(a.map((x) => x.toLowerCase()));
  const bSet = new Set(b.map((x) => x.toLowerCase()));
  let intersection = 0;
  aSet.forEach((x) => { if (bSet.has(x)) intersection++; });
  const union = aSet.size + bSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/* ─── Soft keyword match: does any item in `source` contain / relate to `target`? ─── */
function softMatch(source: string[], target: string): number {
  const t = target.toLowerCase();
  let best = 0;
  for (const s of source) {
    const sl = s.toLowerCase();
    if (sl === t) { best = 1.0; break; }
    if (sl.includes(t) || t.includes(sl)) best = Math.max(best, 0.7);
    // simple trigram-style proximity
    if (sl.length > 3 && t.length > 3 && (sl.includes(t.slice(0, 4)) || t.includes(sl.slice(0, 4)))) {
      best = Math.max(best, 0.4);
    }
  }
  return best;
}

/* ─── GOAL × CATEGORY alignment matrix ─── */
const GOAL_CATEGORY_MATRIX: Record<string, Record<string, number>> = {
  "Transport": {
    "Trouver un job": 0.9,
    "Présenter un service": 1.0,
    "Proposer mes services": 1.0,
    "Demander un service": 0.8,
    "Find a job": 0.9,
    "Offer a service": 1.0,
    "Request a service": 0.8,
    "عرض خدمة": 1.0,
    "طلب خدمة": 0.8,
  },
  "Ménage": {
    "Demander un service": 1.0,
    "Service à domicile": 1.0,
    "Trouver un job": 0.8,
    "Home service": 1.0,
    "Request a service": 1.0,
    "خدمة منزلية": 1.0,
    "طلب خدمة": 1.0,
  },
  "Freelance": {
    "Recruter des freelancers": 1.0,
    "Trouver des projets freelance": 0.9,
    "Find freelance projects": 0.9,
    "Hire freelancers": 1.0,
    "إيجاد مشاريع حرة": 0.9,
  },
  "Cuisine": {
    "Demander un service": 1.0,
    "Présenter un service": 0.9,
    "Home service": 0.9,
    "خدمة منزلية": 1.0,
  },
  "Jardinage": {
    "Demander un service": 1.0,
    "Service à domicile": 0.9,
    "Request a service": 1.0,
    "خدمة منزلية": 0.8,
  },
  "Garde enfants": {
    "Demander un service": 1.0,
    "Service à domicile": 0.9,
    "Rechercher une nounou": 1.0,
    "رعاية الأطفال": 1.0,
  },
  "Plomberie": {
    "Demander un service": 1.0,
    "Service à domicile": 0.9,
    "Request a service": 1.0,
    "طلب خدمة": 1.0,
  },
  "IT": {
    "Recruter des freelancers": 0.9,
    "Trouver des projets freelance": 1.0,
    "Find freelance projects": 1.0,
    "إيجاد مشاريع حرة": 1.0,
  },
};

/* ─── LANGUAGE mapping ─── */
const LANG_NORMALIZE: Record<string, string[]> = {
  arabe: ["ar", "arabe", "arabic", "العربية"],
  français: ["fr", "français", "french", "الفرنسية"],
  english: ["en", "english", "anglais", "الإنجليزية"],
  dialectal: ["ar-dialect", "dialectal", "darja", "دارجة", "arabe dialectal"],
  allemand: ["de", "german", "allemand", "الألمانية"],
  espagnol: ["es", "spanish", "espagnol", "الإسبانية"],
};

function normalizeLang(lang: string): string {
  const ll = lang.toLowerCase();
  for (const [canonical, variants] of Object.entries(LANG_NORMALIZE)) {
    if (variants.some((v) => ll.includes(v) || v.includes(ll))) return canonical;
  }
  return ll;
}

/* ─── Availability day arrays ─── */
const DAY_EN: Record<string, string> = {
  lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
  vendredi: "friday", samedi: "saturday", dimanche: "sunday",
};

function normalizeDays(days: string[]): Set<string> {
  return new Set(days.map((d) => {
    const dl = d.toLowerCase();
    return DAY_EN[dl] ?? dl;
  }));
}

/* ─── MAIN SCORING FUNCTION ─── */
export function computeFullMatchScore(
  profile: Profile,
  userData: RegistrationData,
  prefs: PreferenceVector
): MatchResult {
  const dimensions: ScoreDimension[] = [];

  /* ──────────── 1. INTEREST / SKILL MATCH (weight 28%) ──────────── */
  const userKeywords = [
    ...(userData.selectedInterests ?? []),
    ...(userData.serviceType ? [userData.serviceType] : []),
    ...(userData.profession ? [userData.profession] : []),
    ...(userData.sector ? [userData.sector] : []),
    ...(userData.experiences ?? []).flatMap((e) => [e.type, e.title]),
  ].filter(Boolean);

  const profileKeywords = [...(profile.tags ?? []), profile.role ?? "", profile.category ?? ""];

  // Jaccard + soft match hybrid
  const jaccard = jaccardSim(userKeywords, profileKeywords);
  let softScore = 0;
  for (const kw of userKeywords) softScore += softMatch(profileKeywords, kw);
  const avgSoft = userKeywords.length > 0 ? softScore / userKeywords.length : 0;
  const rawInterest = (jaccard * 0.5 + avgSoft * 0.5) * 100;

  // Apply tag-level weights from behavioral learning
  let tagBoost = 1.0;
  for (const tag of profile.tags) {
    const tw = prefs.categoryWeights[`tag:${tag.toLowerCase()}`];
    if (tw) tagBoost = Math.max(tagBoost, tw);
  }
  const interestScore = Math.min(100, rawInterest * tagBoost);

  const interestReasons = {
    high: {
      fr: `Compétences très alignées avec votre profil (${profile.tags.slice(0, 2).join(", ")})`,
      en: `Skills highly aligned with your profile (${profile.tags.slice(0, 2).join(", ")})`,
      ar: `مهارات متوافقة جداً مع ملفك (${profile.tags.slice(0, 2).join(", ")})`,
    },
    medium: {
      fr: `Domaine partiellement compatible (${profile.category})`,
      en: `Partially compatible domain (${profile.category})`,
      ar: `مجال متوافق جزئياً (${profile.category})`,
    },
    low: {
      fr: `Peu de recoupements détectés`,
      en: `Few overlaps detected`,
      ar: `عدد قليل من التقاطعات`,
    },
  };
  const il = interestScore >= 60 ? "high" : interestScore >= 30 ? "medium" : "low";
  dimensions.push({
    key: "interests",
    label: "Compétences & intérêts",
    labelEn: "Skills & interests",
    labelAr: "المهارات والاهتمامات",
    score: interestScore,
    weight: 0.28,
    icon: "🎯",
    reason: interestReasons[il].fr,
    reasonEn: interestReasons[il].en,
    reasonAr: interestReasons[il].ar,
  });

  /* ──────────── 2. GEOGRAPHIC PROXIMITY (weight 22%) ──────────── */
  const maxDist = userData.radius || 25;
  const distRatio = profile.distance / maxDist;
  // Exponential decay: very close → 100, at radius → ~20, beyond → 0
  const geoScore = Math.max(0, Math.min(100, (1 - distRatio) ** 1.6 * 100));

  // Apply category weight for location
  const catWeight = prefs.categoryWeights[profile.category] ?? 1.0;
  const geoFinal = Math.min(100, geoScore);

  const geoLabel =
    profile.distance < 2 ? { fr: `À ${profile.distance} km — très proche`, en: `${profile.distance} km away — very close`, ar: `على بُعد ${profile.distance} كم — قريب جداً` } :
    profile.distance < 5 ? { fr: `À ${profile.distance} km — dans votre zone`, en: `${profile.distance} km — in your zone`, ar: `${profile.distance} كم — في منطقتك` } :
    { fr: `À ${profile.distance} km`, en: `${profile.distance} km away`, ar: `على بُعد ${profile.distance} كم` };

  dimensions.push({
    key: "geo",
    label: "Proximité géographique",
    labelEn: "Geographic proximity",
    labelAr: "القرب الجغرافي",
    score: geoFinal,
    weight: 0.22,
    icon: "📍",
    reason: geoLabel.fr,
    reasonEn: geoLabel.en,
    reasonAr: geoLabel.ar,
  });

  /* ──────────── 3. GOAL ALIGNMENT (weight 18%) ──────────── */
  const goalMatrix = GOAL_CATEGORY_MATRIX[profile.category] ?? {};
  let goalTotal = 0;
  let goalMatches = 0;
  for (const goal of userData.selectedGoals ?? []) {
    for (const [matrixGoal, value] of Object.entries(goalMatrix)) {
      const sim = softMatch([goal], matrixGoal);
      if (sim > 0.3) { goalTotal += value * sim; goalMatches++; }
    }
  }
  const goalScore = userData.selectedGoals?.length
    ? Math.min(100, (goalTotal / Math.max(1, userData.selectedGoals.length)) * 100)
    : 50; // neutral when no goals set

  dimensions.push({
    key: "goals",
    label: "Alignement des objectifs",
    labelEn: "Goal alignment",
    labelAr: "توافق الأهداف",
    score: goalScore,
    weight: 0.18,
    icon: "🚀",
    reason: goalScore >= 70 ? `Objectifs très compatibles avec ${profile.role}` : goalScore >= 40 ? `Objectifs partiellement alignés` : `Alignement faible des objectifs`,
    reasonEn: goalScore >= 70 ? `Goals very compatible with ${profile.role}` : goalScore >= 40 ? `Goals partially aligned` : `Low goal alignment`,
    reasonAr: goalScore >= 70 ? `الأهداف متوافقة جداً مع ${profile.role}` : goalScore >= 40 ? `الأهداف متوافقة جزئياً` : `توافق ضعيف للأهداف`,
  });

  /* ──────────── 4. AVAILABILITY (weight 12%) ──────────── */
  const userDays = normalizeDays(userData.availabilityDays ?? []);
  const profileDays = normalizeDays(
    profile.schedule ? ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] : []
  );

  // Check schedule string for day mentions
  const schedStr = (profile.schedule ?? "").toLowerCase();
  const daysList = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const scheduleDays = new Set<string>();
  for (const day of daysList) {
    if (schedStr.includes(day)) scheduleDays.add(DAY_EN[day] ?? day);
  }
  // "24h/24" means every day
  if (schedStr.includes("24h") || schedStr.includes("7j")) {
    daysList.forEach((d) => scheduleDays.add(DAY_EN[d] ?? d));
  }
  // "lun – sam" pattern
  if (schedStr.includes("lun") && schedStr.includes("sam")) {
    ["monday","tuesday","wednesday","thursday","friday","saturday"].forEach((d) => scheduleDays.add(d));
  }

  let dayOverlap = 0;
  if (userDays.size > 0 && scheduleDays.size > 0) {
    userDays.forEach((d) => { if (scheduleDays.has(d)) dayOverlap++; });
    dayOverlap = dayOverlap / Math.max(userDays.size, scheduleDays.size);
  } else {
    dayOverlap = 0.5; // unknown = neutral
  }

  // Hour preference (morning/afternoon/evening/flexible)
  const userHours = userData.availabilityHours ?? [];
  const hasFlexible = userHours.includes("flexible") || schedStr.includes("flexible") || schedStr.includes("24h");
  const hourMatch = hasFlexible ? 1.0 : userHours.length === 0 ? 0.5 : 0.7;

  const availScore = Math.min(100, (dayOverlap * 0.6 + hourMatch * 0.4) * 100);

  dimensions.push({
    key: "availability",
    label: "Disponibilité commune",
    labelEn: "Shared availability",
    labelAr: "التوفر المشترك",
    score: availScore,
    weight: 0.12,
    icon: "⏰",
    reason: availScore >= 70 ? `Disponibilités bien alignées` : availScore >= 40 ? `Quelques créneaux en commun` : `Peu de créneaux communs`,
    reasonEn: availScore >= 70 ? `Availability well aligned` : availScore >= 40 ? `Some shared time slots` : `Few common slots`,
    reasonAr: availScore >= 70 ? `التوفر متوافق بشكل جيد` : availScore >= 40 ? `بعض الأوقات المشتركة` : `أوقات مشتركة قليلة`,
  });

  /* ──────────── 5. LANGUAGE MATCH (weight 10%) ──────────── */
  const userLangs = (userData.spokenLanguages ?? []).map(normalizeLang);
  const profileLangs = (profile.languages ?? ["arabe", "français"]).map(normalizeLang);
  const langSim = jaccardSim(userLangs, profileLangs);
  // Bonus if at least 1 shared language
  const sharedLangs = userLangs.filter((l) => profileLangs.includes(l));
  const langScore = Math.min(100,
    userLangs.length === 0 ? 60 : // neutral when not set
    (sharedLangs.length > 0 ? 40 + langSim * 60 : langSim * 40)
  );

  dimensions.push({
    key: "language",
    label: "Langues communes",
    labelEn: "Common languages",
    labelAr: "اللغات المشتركة",
    score: langScore,
    weight: 0.10,
    icon: "🌐",
    reason: sharedLangs.length > 0 ? `Parlez tous les deux ${sharedLangs[0]}` : `Langues à vérifier`,
    reasonEn: sharedLangs.length > 0 ? `Both speak ${sharedLangs[0]}` : `Languages to check`,
    reasonAr: sharedLangs.length > 0 ? `كلاكما يتحدث ${sharedLangs[0]}` : `اللغات للتحقق`,
  });

  /* ──────────── 6. PROFILE QUALITY & RATING (weight 10%) ──────────── */
  const ratingScore = Math.min(100, ((profile.rating - 4.0) / 1.0) * 100);
  const reviewBonus = Math.min(20, profile.reviews / 10);
  const qualityScore = Math.min(100, ratingScore * 0.7 + reviewBonus * 0.3 + (profile.available ? 10 : 0));

  dimensions.push({
    key: "quality",
    label: "Qualité du profil",
    labelEn: "Profile quality",
    labelAr: "جودة الملف",
    score: Math.max(0, qualityScore),
    weight: 0.10,
    icon: "⭐",
    reason: `Note ${profile.rating}/5 · ${profile.reviews} avis${profile.available ? " · Disponible" : ""}`,
    reasonEn: `Rating ${profile.rating}/5 · ${profile.reviews} reviews${profile.available ? " · Available" : ""}`,
    reasonAr: `تقييم ${profile.rating}/5 · ${profile.reviews} تقييم${profile.available ? " · متاح" : ""}`,
  });

  /* ──────────── TOTAL SCORE (weighted sum) ──────────── */
  const rawTotal = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);

  // Apply category behavioral weight
  const behaviorMultiplier = Math.min(1.4, Math.max(0.6, catWeight));

  // Small deterministic jitter (avoids boring equal scores)
  const jitter = (profile.id * 7 + profile.tags.reduce((a, t) => a + t.charCodeAt(0), 0)) % 7 - 3;

  const total = Math.min(99, Math.max(40, Math.round(rawTotal * behaviorMultiplier + jitter)));

  /* ──────────── HIGHLIGHTS (top 3 reasons) ──────────── */
  const sorted = [...dimensions].sort((a, b) => b.score * b.weight - a.score * a.weight);
  const highlights = sorted.slice(0, 3).map((d) => `${d.icon} ${d.reason}`);
  const highlightsEn = sorted.slice(0, 3).map((d) => `${d.icon} ${d.reasonEn}`);
  const highlightsAr = sorted.slice(0, 3).map((d) => `${d.icon} ${d.reasonAr}`);

  const confidence: MatchResult["confidence"] = total >= 75 ? "high" : total >= 55 ? "medium" : "low";

  return {
    profileId: profile.id,
    totalScore: total,
    confidence,
    dimensions,
    highlights,
    highlightsEn,
    highlightsAr,
    computedAt: Date.now(),
    rankPosition: 0, // filled by rankProfiles
  };
}

/* ─── Rank all profiles by AI score ─── */
export function rankProfiles(
  profiles: Profile[],
  userData: RegistrationData,
  prefs: PreferenceVector,
  excludeIds: number[] = []
): Array<{ profile: Profile; result: MatchResult }> {
  return profiles
    .filter((p) => !excludeIds.includes(p.id))
    .map((profile) => ({
      profile,
      result: computeFullMatchScore(profile, userData, prefs),
    }))
    .sort((a, b) => b.result.totalScore - a.result.totalScore)
    .map((item, idx) => ({
      ...item,
      result: { ...item.result, rankPosition: idx + 1 },
    }));
}

/* ─── Confidence label helpers ─── */
export const CONFIDENCE_LABELS = {
  high: { fr: "Très compatible", en: "Highly compatible", ar: "متوافق جداً", color: "#61BCA6" },
  medium: { fr: "Bonne compatibilité", en: "Good match", ar: "توافق جيد", color: "#2F76BB" },
  low: { fr: "Partiellement compatible", en: "Partial match", ar: "توافق جزئي", color: "#F5A623" },
};

export const SCORE_TIER_COLOR = (score: number) =>
  score >= 80 ? "#61BCA6" :
  score >= 65 ? "#2F76BB" :
  score >= 50 ? "#F5A623" : "#A0A0A0";
