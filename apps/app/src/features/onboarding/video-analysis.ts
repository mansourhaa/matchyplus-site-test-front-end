import type { Locale } from '@/features/i18n/messages';

import { DAYS, INDUSTRY_KEYS, type IndustryKey } from './constants';

/**
 * Bridge between the ANALYZE_VIDEO result (apps/voice-ai) and this onboarding form.
 *
 * The voice service answers in the page language with one entry per form field
 * ({ value, label?, status: 'fill' | 'suggest' | ..., alternatives? }). Same rules as the
 * 2.0.8 demo: `fill` entries (the service is sure) fill a field the person left empty;
 * `suggest` entries, and the alternatives of a filled field, become one-click proposals
 * under the field; a `suggest` sector still pre-selects the best sector. Nothing the
 * person typed is ever overwritten, and nothing in the wrong alphabet is shown.
 */
export type OnboardingSuggestions = {
  firstName?: string;
  lastName?: string;
  job?: string;
  bio?: string;
  industry?: IndustryKey;
  offerService?: boolean;
  price?: string;
  city?: string;
  /** Values of DAYS[].short, e.g. 'Lun'. */
  availabilityDays?: string[];
  /** Values of TIME_SLOTS[].value: 'morning' | 'afternoon' | 'evening'. */
  availabilityHours?: string[];
  /** Values of LANGUAGE_OPTIONS[].value: 'ar' | 'fr' | 'en'. */
  languages?: string[];
  /** One-click proposals under a text field (2.0.8 « suggest » chips). */
  proposals?: Partial<Record<ProposalField, string[]>>;
  /** Catalogue interests (INTERESTS_SUGGESTIONS values) matching the job heard in the video. */
  interestTags?: string[];
  /** SERVICE_TYPES value matching that job. */
  serviceType?: string;
  /** The job is a home service (cleaning, childcare, gardening…). */
  homeService?: boolean;
};

export type ProposalField = 'firstName' | 'lastName' | 'job' | 'bio' | 'city';

type AnalyzedField = {
  value?: string | number | null;
  label?: string | null;
  status?: string;
  alternatives?: { value?: string | number | null; label?: string | null }[] | null;
};

export type VideoAnalysisResult = {
  ok?: boolean;
  error?: string;
  profile?: Record<string, AnalyzedField | undefined>;
};

const DAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const SLOT_CODES = ['morning', 'afternoon', 'evening'] as const;
type DayCode = (typeof DAY_CODES)[number];
type SlotCode = (typeof SLOT_CODES)[number];

// Same words the voice service writes (apps/voice-ai/app/rules.py).
const DAY_LABEL: Record<Locale, Record<DayCode, string>> = {
  fr: {
    mon: 'lundi',
    tue: 'mardi',
    wed: 'mercredi',
    thu: 'jeudi',
    fri: 'vendredi',
    sat: 'samedi',
    sun: 'dimanche',
  },
  ar: {
    mon: 'الاثنين',
    tue: 'الثلاثاء',
    wed: 'الأربعاء',
    thu: 'الخميس',
    fri: 'الجمعة',
    sat: 'السبت',
    sun: 'الأحد',
  },
  en: {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  },
};
const SLOT_LABEL: Record<Locale, Record<SlotCode, string>> = {
  fr: { morning: 'matin', afternoon: 'après-midi', evening: 'soir' },
  ar: { morning: 'صباحًا', afternoon: 'بعد الظهر', evening: 'مساءً' },
  en: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' },
};
const EVERY_DAY: Record<Locale, string> = { fr: 'tous les jours', ar: 'كل يوم', en: 'every day' };
const LANGUAGE_LABEL: Record<Locale, Record<'ar' | 'fr' | 'en', string>> = {
  fr: { ar: 'arabe', fr: 'français', en: 'anglais' },
  ar: { ar: 'العربية', fr: 'الفرنسية', en: 'الإنجليزية' },
  en: { ar: 'Arabic', fr: 'French', en: 'English' },
};

const normalize = (text: string) => text.trim().toLowerCase().replace(/[ً-ْ]/g, '');

/** « du lundi au vendredi · matin » → { days: ['Lun', …, 'Ven'], hours: ['morning'] }. */
export function parseAvailability(
  text: string,
  locale: Locale,
): { days: string[]; hours: string[] } {
  const days = new Set<DayCode>();
  const slots = new Set<SlotCode>();
  const dayOf = (word: string) =>
    DAY_CODES.find((code) => normalize(DAY_LABEL[locale][code]) === normalize(word));
  const slotOf = (word: string) =>
    SLOT_CODES.find((code) => normalize(SLOT_LABEL[locale][code]) === normalize(word));

  for (const part of (text || '')
    .split('·')
    .map((value) => value.trim())
    .filter(Boolean)) {
    if (normalize(part) === normalize(EVERY_DAY[locale])) {
      DAY_CODES.forEach((code) => days.add(code));
      continue;
    }
    const range =
      locale === 'ar'
        ? part.match(/^من\s+(\S+)\s+إلى\s+(\S+)$/)
        : locale === 'fr'
          ? part.match(/^du\s+(\S+)\s+au\s+(\S+)$/i)
          : part.match(/^(\S+)\s+to\s+(\S+)$/i);
    const from = range ? dayOf(range[1]) : undefined;
    const to = range ? dayOf(range[2]) : undefined;
    if (from && to) {
      const start = DAY_CODES.indexOf(from);
      const end = DAY_CODES.indexOf(to);
      for (let index = start; index <= (end >= start ? end : end + 7); index += 1) {
        days.add(DAY_CODES[index % 7]);
      }
      continue;
    }
    for (const word of part
      .split(/[,،]/)
      .map((value) => value.trim())
      .filter(Boolean)) {
      const day = dayOf(word);
      const slot = slotOf(word);
      if (day) days.add(day);
      else if (slot) slots.add(slot);
    }
  }

  return {
    days: DAY_CODES.filter((code) => days.has(code)).map(
      (code) => DAYS[DAY_CODES.indexOf(code)].short,
    ),
    hours: SLOT_CODES.filter((code) => slots.has(code)),
  };
}

/** « arabe, français » → ['ar', 'fr']. */
export function parseLanguages(text: string, locale: Locale): string[] {
  const words = (text || '').split(/[,،]/).map(normalize).filter(Boolean);
  return (['ar', 'fr', 'en'] as const).filter((code) =>
    words.includes(normalize(LANGUAGE_LABEL[locale][code])),
  );
}

function sure(result: VideoAnalysisResult, key: string): AnalyzedField | null {
  const field = result.profile?.[key];
  if (!field || field.status !== 'fill') return null;
  if (field.value === null || field.value === undefined || String(field.value).trim() === '') {
    return null;
  }
  return field;
}

function proposed(result: VideoAnalysisResult, key: string): AnalyzedField | null {
  const field = result.profile?.[key];
  if (!field || field.status !== 'suggest') return null;
  if (field.value === null || field.value === undefined || String(field.value).trim() === '') {
    return null;
  }
  return field;
}

const PROPOSAL_FIELDS = {
  first_name: 'firstName',
  last_name: 'lastName',
  profession: 'job',
  bio: 'bio',
  city: 'city',
} as const satisfies Record<string, ProposalField>;

const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-zÀ-ÿ]/;

/** Text written in the page alphabet: Arabic letters only on the AR page, none elsewhere. */
export function inPageScript(text: string, locale: Locale): boolean {
  return locale === 'ar' ? ARABIC.test(text) && !LATIN.test(text) : !ARABIC.test(text);
}

/** `suggest` value + alternatives (or the alternatives of a filled value), max 3, page alphabet. */
function proposalOptions(
  result: VideoAnalysisResult,
  key: string,
  filled: string | undefined,
  locale: Locale,
): string[] {
  const field = result.profile?.[key];
  if (!field) return [];
  const candidates: string[] = [];
  if (field.status === 'suggest' && field.value !== null && field.value !== undefined) {
    candidates.push(String(field.label || field.value));
  }
  if (field.status === 'fill' || field.status === 'suggest') {
    for (const alternative of field.alternatives ?? []) {
      candidates.push(String(alternative.label || alternative.value || ''));
    }
  }
  const options: string[] = [];
  for (const raw of candidates) {
    const option = raw.trim();
    if (option && option !== filled && !options.includes(option) && inPageScript(option, locale)) {
      options.push(option);
    }
  }
  return options.slice(0, 3);
}

/**
 * Voice-service job ids (apps/voice-ai/data/services.json, « famille.métier ») → the step 2
 * catalogues of this app: INTERESTS_SUGGESTIONS and SERVICE_TYPES. First matching rule wins.
 */
const SERVICE_TAG_RULES: {
  match: RegExp;
  interests: string[];
  serviceType?: string;
  homeService?: boolean;
}[] = [
  {
    match: /^(menage\.|maison\.repassage$)/,
    interests: ['Ménage'],
    serviceType: 'Aide ménagère',
    homeService: true,
  },
  {
    match: /^enfance\./,
    interests: ['Enfants'],
    serviceType: "Garde d'enfants",
    homeService: true,
  },
  { match: /^evenements\.animation_enfants$/, interests: ['Enfants'] },
  {
    match: /^maison\.jardinage$/,
    interests: ['Jardinage'],
    serviceType: 'Jardinage / Bricolage',
    homeService: true,
  },
  {
    match: /^maison\.demenagement$/,
    interests: ['Déménagement', 'Transport'],
    serviceType: 'Chauffeur / Transport',
  },
  {
    match: /^(maison\.cuisiniere|cuisine\.|evenements\.traiteur$)/,
    interests: ['Cuisine'],
    serviceType: 'Restauration / Service',
  },
  {
    match: /^batiment\.plomberie$/,
    interests: ['Plomberie', 'Bricolage'],
    serviceType: 'Jardinage / Bricolage',
    homeService: true,
  },
  {
    match: /^batiment\.electricite$/,
    interests: ['Électricité', 'Bricolage'],
    serviceType: 'Jardinage / Bricolage',
    homeService: true,
  },
  {
    match: /^batiment\.peinture$/,
    interests: ['Peinture', 'Bricolage'],
    serviceType: 'Jardinage / Bricolage',
    homeService: true,
  },
  {
    match: /^batiment\./,
    interests: ['Bricolage'],
    serviceType: 'Jardinage / Bricolage',
    homeService: true,
  },
  { match: /^auto\.electricite$/, interests: ['Électricité'] },
  { match: /^transport\./, interests: ['Transport'], serviceType: 'Chauffeur / Transport' },
  { match: /^tech\.graphiste$/, interests: ['Graphisme'], serviceType: 'Informatique / Tech' },
  { match: /^tech\.community$/, interests: ['Marketing'], serviceType: 'Informatique / Tech' },
  { match: /^tech\./, interests: ['Informatique'], serviceType: 'Informatique / Tech' },
  {
    match: /^bureau\.comptable$/,
    interests: ['Comptabilité'],
    serviceType: 'Services & missions / Consulting',
  },
  { match: /^(bureau\.traducteur|education\.langues)$/, interests: ['Traduction'] },
  { match: /^(bureau|pro)\./, interests: [], serviceType: 'Services & missions / Consulting' },
  {
    match: /^sante\.(garde_malade|infirmier)$/,
    interests: [],
    serviceType: 'Service à domicile',
    homeService: true,
  },
];

/** Sector alone (no job recognised): Technology & Digital → Informatique. */
const SECTOR_INTERESTS: Record<string, string[]> = { '3': ['Informatique'] };

export function tagsForService(
  serviceId: string,
  sectorCode = '',
): { interests: string[]; serviceType?: string; homeService?: boolean } {
  const rule = serviceId
    ? SERVICE_TAG_RULES.find((entry) => entry.match.test(serviceId))
    : undefined;
  if (rule) {
    return {
      interests: rule.interests,
      serviceType: rule.serviceType,
      homeService: rule.homeService,
    };
  }
  return { interests: SECTOR_INTERESTS[sectorCode] ?? [] };
}

/** The 10 sectors of the voice service are the 10 INDUSTRY_KEYS, in the same order (1 → 10). */
function industryFromSector(value: string | number): IndustryKey | undefined {
  const index = Number(value) - 1;
  return Number.isInteger(index) ? INDUSTRY_KEYS[index] : undefined;
}

/** « 20 DT », « ٢٠ د.ت » → « 20 » (the price field holds a plain amount). */
function priceAmount(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const western = text.replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
  const amount = western.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');
  return amount && Number(amount) > 0 ? amount : undefined;
}

export function suggestionsFromAnalysis(
  result: VideoAnalysisResult | null | undefined,
  locale: Locale,
): OnboardingSuggestions {
  const suggestions: OnboardingSuggestions = {};
  if (!result?.ok) return suggestions;

  const text = (key: string) => {
    const field = sure(result, key);
    return field ? String(field.label || field.value).trim() : undefined;
  };

  suggestions.firstName = text('first_name');
  suggestions.lastName = text('last_name');
  suggestions.job = text('profession');
  suggestions.bio = text('bio');
  suggestions.city = text('city');
  suggestions.price = priceAmount(text('price'));

  // A `suggest` sector still pre-selects the best one (closed list, easy to change), as in 2.0.8.
  const sector = sure(result, 'sector_id') ?? proposed(result, 'sector_id');
  if (sector?.value !== undefined && sector.value !== null) {
    suggestions.industry = industryFromSector(sector.value);
  }

  const proposals: OnboardingSuggestions['proposals'] = {};
  for (const [source, target] of Object.entries(PROPOSAL_FIELDS)) {
    const options = proposalOptions(result, source, suggestions[target], locale);
    if (options.length) proposals[target] = options;
  }
  if (Object.keys(proposals).length) suggestions.proposals = proposals;

  const usage = sure(result, 'usage_type');
  if (usage?.value === 'provider') suggestions.offerService = true;

  // Step 2 tags from the job heard in the video (sure, or proposed): catalogue interests,
  // service type, and whether it is a home service (for the goals).
  const profession = sure(result, 'profession') ?? proposed(result, 'profession');
  const serviceId = profession ? String(profession.value) : '';
  const sectorCode =
    sector?.value !== undefined && sector.value !== null ? String(sector.value) : '';
  const tags = tagsForService(serviceId, sectorCode);
  if (tags.interests.length) suggestions.interestTags = tags.interests;
  if (tags.serviceType) suggestions.serviceType = tags.serviceType;
  if (tags.homeService) suggestions.homeService = true;

  const availability = text('availability');
  if (availability) {
    const { days, hours } = parseAvailability(availability, locale);
    if (days.length) suggestions.availabilityDays = days;
    if (hours.length) suggestions.availabilityHours = hours;
  }

  const languages = text('spoken_languages');
  if (languages) {
    const codes = parseLanguages(languages, locale);
    if (codes.length) suggestions.languages = codes;
  }

  return Object.fromEntries(
    Object.entries(suggestions).filter(([, value]) => value !== undefined),
  ) as OnboardingSuggestions;
}

/** Voice-service field → form field, for the text fields that change with the page language. */
const RELABEL_TEXT_FIELDS = {
  first_name: 'firstName',
  last_name: 'lastName',
  profession: 'job',
  city: 'city',
  bio: 'bio',
} as const satisfies Record<string, keyof OnboardingSuggestions>;
type RelabelTextField = keyof typeof RELABEL_TEXT_FIELDS;

export type RelabelSource = {
  /** The sure text fields, as written by the voice service in the analysis language. */
  values: Partial<Record<RelabelTextField | 'years_experience' | 'availability', string>>;
  /** Catalogue id of the recognised job (e.g. menage.aide_menagere), if any. */
  serviceId: string | null;
};

export type RelabelledFields = Partial<
  Record<string, { value: string | null; review?: boolean } | undefined>
>;

/** What the language switch sends to /onboarding/relabel: the AI's own words, not the form. */
export function relabelSourceFromAnalysis(
  result: VideoAnalysisResult | null | undefined,
): RelabelSource {
  const values: RelabelSource['values'] = {};
  if (!result?.ok) return { values, serviceId: null };
  for (const key of [...Object.keys(RELABEL_TEXT_FIELDS), 'years_experience', 'availability']) {
    const field = sure(result, key);
    if (field) values[key as keyof RelabelSource['values']] = String(field.label || field.value);
  }
  const profession = sure(result, 'profession');
  const serviceId =
    profession && /^[a-z0-9_.-]+$/.test(String(profession.value)) ? String(profession.value) : null;
  return { values, serviceId };
}

/**
 * Same suggestions in another page language: only the text fields change (codes such as
 * the sector, days, hours and languages do not depend on the language). A field the voice
 * service could not write in that language is dropped, so no page ever mixes alphabets.
 */
export function applyRelabel(
  suggestions: OnboardingSuggestions,
  fields: RelabelledFields,
  locale: Locale,
  relabelledProposals: RelabelledProposals = {},
): OnboardingSuggestions {
  const next: OnboardingSuggestions = { ...suggestions };
  for (const [source, target] of Object.entries(RELABEL_TEXT_FIELDS)) {
    if (suggestions[target] === undefined) continue;
    const value = fields[source]?.value?.trim();
    if (value) next[target] = value;
    else delete next[target];
  }
  const proposals: OnboardingSuggestions['proposals'] = {};
  for (const [source, target] of Object.entries(RELABEL_TEXT_FIELDS)) {
    const options: string[] = [];
    for (const option of relabelledProposals[source] ?? []) {
      const text = String(option.label || option.value || '').trim();
      if (text && text !== next[target] && !options.includes(text) && inPageScript(text, locale)) {
        options.push(text);
      }
    }
    if (options.length) proposals[target] = options.slice(0, 3);
  }
  if (Object.keys(proposals).length) next.proposals = proposals;
  else delete next.proposals;
  return next;
}

export type RelabelledProposals = Partial<
  Record<string, { value?: string | null; label?: string | null }[] | undefined>
>;

/** The proposals of the analysis, in the shape /relabel expects ({ voice field: options }). */
export function proposalsForRelabel(
  suggestions: OnboardingSuggestions,
): Record<string, { value: string; label: string }[]> {
  const out: Record<string, { value: string; label: string }[]> = {};
  for (const [source, target] of Object.entries(RELABEL_TEXT_FIELDS)) {
    const options = suggestions.proposals?.[target];
    if (options?.length) out[source] = options.map((text) => ({ value: text, label: text }));
  }
  return out;
}

type TextSuggestion = 'firstName' | 'lastName' | 'job' | 'bio' | 'city';

/**
 * Next value of a form field when new suggestions arrive: an empty field takes the
 * suggestion; a field still holding the AI's previous value (same analysis, other page
 * language) takes the new one; anything the person typed stays.
 */
export function aiFieldUpdate(
  previous: OnboardingSuggestions | null,
  suggestions: OnboardingSuggestions,
) {
  return (current: string, key: TextSuggestion): string => {
    if (!current) return suggestions[key] || '';
    if (previous && previous[key] && current === previous[key]) return suggestions[key] || '';
    return current;
  };
}

/**
 * Fallback when the language switch could not reach the voice service: the AI values
 * already written in the new page alphabet stay, the others are dropped, so a page never
 * mixes alphabets (e.g. Arabic names on the French page).
 */
export function keepPageScript(
  suggestions: OnboardingSuggestions,
  locale: Locale,
): OnboardingSuggestions {
  const next: OnboardingSuggestions = { ...suggestions };
  for (const target of Object.values(RELABEL_TEXT_FIELDS)) {
    const value = next[target];
    if (value !== undefined && !inPageScript(value, locale)) delete next[target];
  }
  const proposals: OnboardingSuggestions['proposals'] = {};
  for (const [field, options] of Object.entries(suggestions.proposals ?? {})) {
    const kept = (options ?? []).filter((option) => inPageScript(option, locale));
    if (kept.length) proposals[field as ProposalField] = kept;
  }
  if (Object.keys(proposals).length) next.proposals = proposals;
  else delete next.proposals;
  return next;
}

/** The catalogue interests in the page language (the catalogue itself is in French). */
const INTEREST_LABELS: Record<string, Record<Locale, string>> = {
  Bricolage: { fr: 'Bricolage', ar: 'أعمال يدوية', en: 'DIY' },
  Jardinage: { fr: 'Jardinage', ar: 'بستنة', en: 'Gardening' },
  Enfants: { fr: 'Enfants', ar: 'أطفال', en: 'Children' },
  Ménage: { fr: 'Ménage', ar: 'نظافة', en: 'Cleaning' },
  Cuisine: { fr: 'Cuisine', ar: 'طبخ', en: 'Cooking' },
  Informatique: { fr: 'Informatique', ar: 'إعلامية', en: 'IT' },
  Traduction: { fr: 'Traduction', ar: 'ترجمة', en: 'Translation' },
  Graphisme: { fr: 'Graphisme', ar: 'تصميم جرافيكي', en: 'Graphic design' },
  Marketing: { fr: 'Marketing', ar: 'تسويق', en: 'Marketing' },
  Comptabilité: { fr: 'Comptabilité', ar: 'محاسبة', en: 'Accounting' },
  Transport: { fr: 'Transport', ar: 'نقل', en: 'Transport' },
  Déménagement: { fr: 'Déménagement', ar: 'نقل الأثاث', en: 'Moving' },
  Plomberie: { fr: 'Plomberie', ar: 'سباكة', en: 'Plumbing' },
  Électricité: { fr: 'Électricité', ar: 'كهرباء', en: 'Electricity' },
  Peinture: { fr: 'Peinture', ar: 'دهن', en: 'Painting' },
};

/** Interests added from the video, written in the page language: the job, then the tags. */
export function videoInterests(suggestions: OnboardingSuggestions, locale: Locale): string[] {
  const labels = [
    suggestions.job,
    ...(suggestions.interestTags ?? []).map((tag) => INTEREST_LABELS[tag]?.[locale] ?? tag),
  ].filter((entry): entry is string => Boolean(entry) && inPageScript(entry as string, locale));
  return labels.filter(
    (entry, index) =>
      labels.findIndex((other) => other.toLowerCase() === entry.toLowerCase()) === index,
  );
}
