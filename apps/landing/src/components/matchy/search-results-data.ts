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
