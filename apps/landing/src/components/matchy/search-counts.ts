import type { Locale } from '@/features/i18n/messages';
import { API_URL } from '@/lib/constants';

/**
 * How many pros a search finds, shown on /recherche/ ("35 plombiers disponibles à Sousse"): the
 * real number from the API (`GET /api/v1/pros/count?service=Plombier&city=Sousse`, apps/api
 * ProsService), since 26 Nov 2026. This file recognises the typed service and city (typos,
 * accents, fr/en/ar) and gives the words of the sentence.
 */
export type ProCount = { service: ServiceCode; city: CityId; count: number };

export type ServiceCode = (typeof SERVICES)[number]['code'];
export type CityId = (typeof CITIES)[number]['id'];

/**
 * The 10 trades of the belt (same codes and names as `landing.beltServices`), with the words a
 * visitor may type (fr/en/ar) and the plural used in the sentence.
 */
export const SERVICES = [
  {
    code: 'PLB',
    name: { fr: 'Plombier', en: 'Plumber', ar: 'سبّاك' },
    words: ['plombier', 'plomberie', 'plumber', 'plumbing', 'سباك', 'سباكة'],
    plural: { fr: 'plombiers', en: 'plumbers', ar: 'سبّاكًا' },
  },
  {
    code: 'ELC',
    name: { fr: 'Électricien', en: 'Electrician', ar: 'كهربائي' },
    words: ['electricien', 'electricite', 'electrician', 'electricity', 'كهربائي', 'كهرباء'],
    plural: { fr: 'électriciens', en: 'electricians', ar: 'كهربائيًا' },
  },
  {
    code: 'CHF',
    name: { fr: 'Chauffeur', en: 'Driver', ar: 'سائق' },
    words: ['chauffeur', 'driver', 'سائق'],
    plural: { fr: 'chauffeurs', en: 'drivers', ar: 'سائقًا' },
  },
  {
    code: 'GDE',
    name: { fr: 'Garde d’enfants', en: 'Childcare', ar: 'رعاية الأطفال' },
    words: [
      'garde denfants',
      'nounou',
      'babysitter',
      'childcare',
      'nanny',
      'رعاية الاطفال',
      'مربية',
    ],
    plural: { fr: 'gardes d’enfants', en: 'childminders', ar: 'مربّيةً' },
  },
  {
    code: 'MEN',
    name: { fr: 'Aide ménagère', en: 'Housekeeper', ar: 'عاملة منزلية' },
    words: [
      'aide menagere',
      'menage',
      'femme de menage',
      'housekeeper',
      'cleaning',
      'عاملة منزلية',
      'تنظيف',
    ],
    plural: { fr: 'aides ménagères', en: 'housekeepers', ar: 'عاملةً منزلية' },
  },
  {
    code: 'LIV',
    name: { fr: 'Livreur', en: 'Delivery driver', ar: 'عامل توصيل' },
    words: ['livreur', 'livraison', 'delivery', 'delivery driver', 'عامل توصيل', 'توصيل'],
    plural: { fr: 'livreurs', en: 'delivery drivers', ar: 'عاملَ توصيل' },
  },
  {
    code: 'CUI',
    name: { fr: 'Cuisinier', en: 'Cook', ar: 'طبّاخ' },
    words: ['cuisinier', 'cuisine', 'cook', 'chef', 'طباخ'],
    plural: { fr: 'cuisiniers', en: 'cooks', ar: 'طبّاخًا' },
  },
  {
    code: 'COU',
    name: { fr: 'Couturière', en: 'Seamstress', ar: 'خيّاطة' },
    words: ['couturiere', 'couturier', 'couture', 'seamstress', 'tailor', 'خياطة', 'خياط'],
    plural: { fr: 'couturières', en: 'seamstresses', ar: 'خيّاطةً' },
  },
  {
    code: 'JAR',
    name: { fr: 'Jardinier', en: 'Gardener', ar: 'بستاني' },
    words: ['jardinier', 'jardinage', 'gardener', 'gardening', 'بستاني'],
    plural: { fr: 'jardiniers', en: 'gardeners', ar: 'بستانيًا' },
  },
  {
    code: 'SRV',
    name: { fr: 'Serveur', en: 'Waiter', ar: 'نادل' },
    words: ['serveur', 'serveuse', 'waiter', 'waitress', 'نادل'],
    plural: { fr: 'serveurs', en: 'waiters', ar: 'نادلًا' },
  },
] as const;

/** Tunisian cities (the 24 governorates' main towns, plus Hammamet and Djerba). */
export const CITIES = [
  { id: 'tunis', name: { fr: 'Tunis', en: 'Tunis', ar: 'تونس' } },
  { id: 'ariana', name: { fr: 'Ariana', en: 'Ariana', ar: 'أريانة' } },
  { id: 'ben-arous', name: { fr: 'Ben Arous', en: 'Ben Arous', ar: 'بن عروس' } },
  { id: 'manouba', name: { fr: 'La Manouba', en: 'Manouba', ar: 'منوبة' } },
  { id: 'nabeul', name: { fr: 'Nabeul', en: 'Nabeul', ar: 'نابل' } },
  { id: 'hammamet', name: { fr: 'Hammamet', en: 'Hammamet', ar: 'الحمامات' } },
  { id: 'zaghouan', name: { fr: 'Zaghouan', en: 'Zaghouan', ar: 'زغوان' } },
  { id: 'bizerte', name: { fr: 'Bizerte', en: 'Bizerte', ar: 'بنزرت' } },
  { id: 'beja', name: { fr: 'Béja', en: 'Beja', ar: 'باجة' } },
  { id: 'jendouba', name: { fr: 'Jendouba', en: 'Jendouba', ar: 'جندوبة' } },
  { id: 'kef', name: { fr: 'Le Kef', en: 'El Kef', ar: 'الكاف' } },
  { id: 'siliana', name: { fr: 'Siliana', en: 'Siliana', ar: 'سليانة' } },
  { id: 'sousse', name: { fr: 'Sousse', en: 'Sousse', ar: 'سوسة' } },
  { id: 'monastir', name: { fr: 'Monastir', en: 'Monastir', ar: 'المنستير' } },
  { id: 'mahdia', name: { fr: 'Mahdia', en: 'Mahdia', ar: 'المهدية' } },
  { id: 'sfax', name: { fr: 'Sfax', en: 'Sfax', ar: 'صفاقس' } },
  { id: 'kairouan', name: { fr: 'Kairouan', en: 'Kairouan', ar: 'القيروان' } },
  { id: 'kasserine', name: { fr: 'Kasserine', en: 'Kasserine', ar: 'القصرين' } },
  { id: 'sidi-bouzid', name: { fr: 'Sidi Bouzid', en: 'Sidi Bouzid', ar: 'سيدي بوزيد' } },
  { id: 'gabes', name: { fr: 'Gabès', en: 'Gabes', ar: 'قابس' } },
  { id: 'medenine', name: { fr: 'Médenine', en: 'Medenine', ar: 'مدنين' } },
  { id: 'djerba', name: { fr: 'Djerba', en: 'Djerba', ar: 'جربة' } },
  { id: 'tataouine', name: { fr: 'Tataouine', en: 'Tataouine', ar: 'تطاوين' } },
  { id: 'gafsa', name: { fr: 'Gafsa', en: 'Gafsa', ar: 'قفصة' } },
  { id: 'tozeur', name: { fr: 'Tozeur', en: 'Tozeur', ar: 'توزر' } },
  { id: 'kebili', name: { fr: 'Kébili', en: 'Kebili', ar: 'قبلي' } },
] as const;

/** Lower case, no accents, no Arabic vowel marks, letters and spaces only: "Électricien" → "electricien". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ًͯ-ْـ]/g, '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^a-zء-ي ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Edit distance with swapped letters counted as one step: "pombire" is 2 steps from "plombier". */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Typos allowed for a word of this length: none for short words, up to 2 for long ones. */
function allowedTypos(length: number): number {
  return length <= 3 ? 0 : length <= 5 ? 1 : 2;
}

/** The closest known word for what the visitor typed, or undefined if none is close enough. */
function closest<T>(typed: string, items: readonly T[], words: (item: T) => readonly string[]) {
  const query = normalize(typed);
  if (!query) return undefined;
  let best: { item: T; steps: number } | undefined;
  for (const item of items) {
    for (const word of words(item)) {
      const target = normalize(word);
      const steps = distance(query, target);
      if (steps <= allowedTypos(target.length) && (!best || steps < best.steps)) {
        best = { item, steps };
      }
    }
  }
  return best?.item;
}

export function findService(typed: string) {
  return closest(typed, SERVICES, (service) => service.words);
}

export function findCity(typed: string) {
  return closest(typed, CITIES, (city) => Object.values(city.name));
}

/**
 * The API request for a search, or null when the service or the city is not recognised (then
 * nothing is asked and no number is shown). The French names are sent: the API widens the trade
 * to every language with its taxonomy, and cities are stored with their Latin names.
 */
export function proCountRequest(typedService: string, typedCity: string) {
  const service = findService(typedService);
  const city = findCity(typedCity);
  if (!service || !city) return null;
  const params = new URLSearchParams({ service: service.name.fr, city: city.name.fr });
  return { service: service.code, city: city.id, url: `${API_URL}/v1/pros/count?${params}` };
}

/**
 * How many pros match a search, from the API (`GET /v1/pros/count`). Null when the search is not
 * recognised, when no pro matches, or when the API cannot be reached: the page then shows its
 * usual title, never an invented number.
 */
export async function fetchProCount(
  typedService: string,
  typedCity: string,
  fetcher: typeof fetch = fetch,
): Promise<ProCount | null> {
  const request = proCountRequest(typedService, typedCity);
  if (!request) return null;
  try {
    const response = await fetcher(request.url);
    if (!response.ok) return null;
    const { count } = (await response.json()) as { count?: unknown };
    if (typeof count !== 'number' || count < 1) return null;
    return { service: request.service, city: request.city, count };
  } catch {
    // network error or the API is down: no number rather than a wrong one
    return null;
  }
}

/**
 * What to put back in the search bar: the recognised names in the page's language ("pombire" →
 * "Plombier"), or what the visitor typed when it is not recognised.
 */
export function correctedSearch(typedService: string, typedCity: string, locale: Locale) {
  return {
    service: findService(typedService)?.name[locale] ?? typedService,
    city: findCity(typedCity)?.name[locale] ?? typedCity,
  };
}

/** The plural trade and the city's name in a language, for the sentence. */
export function countWords(count: ProCount, locale: Locale) {
  const service = SERVICES.find((item) => item.code === count.service);
  const city = CITIES.find((item) => item.id === count.city);
  return { service: service?.plural[locale] ?? '', city: city?.name[locale] ?? '' };
}
