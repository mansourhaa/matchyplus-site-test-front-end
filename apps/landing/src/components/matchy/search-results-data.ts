/** Sign-up link that carries the visitor's search, e.g. …/register?service=Plombier&ville=Sfax. */
export function buildSearchUrl(base: string, service: string, city: string): string {
  const url = new URL(base);
  if (service.trim()) url.searchParams.set('service', service.trim());
  if (city.trim()) url.searchParams.set('ville', city.trim());
  return url.toString();
}

/** Path with the visitor's search, e.g. /fr/recherche/?service=Plombier&ville=Sfax. */
export function withSearch(path: string, service: string, city: string): string {
  const params = new URLSearchParams();
  if (service.trim()) params.set('service', service.trim());
  if (city.trim()) params.set('ville', city.trim());
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Number of pros shown on the results page, between 12 and 48. Matchy+ has no public search API
 * yet, so it is a sample (labelled on the page): the same search always gives the same number.
 */
export function sampleResultCount(service: string, city: string): number {
  const key = `${service.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 100_003;
  return 12 + (hash % 37);
}
