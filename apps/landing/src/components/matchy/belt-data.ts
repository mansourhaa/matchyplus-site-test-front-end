import type { BeltProfile } from './belt-profile-card';

export type ServiceImage = { src: string; width: number; height: number };

export type BeltService = {
  code: string;
  title: string;
  description: string;
  items: string[];
  image: ServiceImage;
};

/** Cut-out illustration for each service code declared in `landing.beltServices`. */
export const SERVICE_IMAGES: Record<string, ServiceImage> = {
  PLB: { src: '/matchy/belt/plumber-v2.webp', width: 507, height: 1100 },
  ELC: { src: '/matchy/belt/electrician.webp', width: 513, height: 1100 },
  CHF: { src: '/matchy/belt/driver.webp', width: 483, height: 1097 },
  GDE: { src: '/matchy/belt/nanny.webp', width: 471, height: 946 },
  MEN: { src: '/matchy/belt/cleaner.webp', width: 435, height: 905 },
  LIV: { src: '/matchy/belt/delivery.webp', width: 791, height: 1077 },
  CUI: { src: '/matchy/belt/cook.webp', width: 556, height: 1067 },
  COU: { src: '/matchy/belt/seamstress.webp', width: 482, height: 1062 },
  JAR: { src: '/matchy/belt/gardener.webp', width: 527, height: 1139 },
  SRV: { src: '/matchy/belt/waiter.webp', width: 678, height: 1156 },
};

/** Rows of `landing.beltProfiles`: [code, name, age, km, rating, reviews, score, price, bio, ...tags]. */
export function toProfiles(rows: unknown): Record<string, BeltProfile> {
  if (!Array.isArray(rows)) return {};
  const profiles: Record<string, BeltProfile> = {};
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const [code, name, age, distanceKm, rating, reviews, score, price, bio, ...tags] =
      row as string[];
    profiles[code] = {
      name,
      age,
      distanceKm,
      rating,
      reviews,
      score: Number(score),
      price,
      bio,
      tags,
    };
  }
  return profiles;
}

/** Rows of `landing.beltServices`: [code, title, description, ...items]. Unknown codes are skipped. */
export function toServices(rows: unknown): BeltService[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!Array.isArray(row)) return [];
    const [code, title, description, ...items] = row as string[];
    const image = SERVICE_IMAGES[code];
    return image ? [{ code, title, description, items, image }] : [];
  });
}

/**
 * Hover tag of a pro on the belt, e.g. "Youssef B. · 25 DT/h". Without a profile, the trade
 * name is shown instead.
 */
export function personTag(
  profile: BeltProfile | undefined,
  priceLabel: string,
  fallback: string,
): string {
  return profile ? `${profile.name} · ${priceLabel}` : fallback;
}
