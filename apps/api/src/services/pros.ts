import { Prisma, PrismaClient, UserStatus } from '@saas-boilerplate/types';

import { CONCEPTS_CATALOG, lookupConcept } from '../taxonomy/index.js';
import { ProCountQuery, ProCountResponse } from '../types/pros.js';
import { AbstractServiceOptions } from '../types/services.js';

/** At most this many trade words are searched, so one request stays a small query. */
const MAX_TRADE_TERMS = 12;

/**
 * Public counts for the landing site's search page. Only numbers leave this service: no
 * names, photos or ids, so the endpoint can stay unauthenticated.
 */
export class ProsService {
  prisma: PrismaClient;

  constructor(options: AbstractServiceOptions) {
    this.prisma = options.prisma;
  }

  /**
   * Active users who offer a service, whose trade (`service_type`, `job` or `category`) matches the
   * searched trade, and whose `city` matches the searched city. The trade is widened to all
   * its taxonomy variants, so "plombier", "plumber" and "سباك" find the same people.
   */
  async count(query: ProCountQuery): Promise<ProCountResponse> {
    try {
      const terms = this.tradeTerms(query.service);
      const city = query.city.trim();
      const tradeFilters: Prisma.UserWhereInput[] = terms.flatMap((term) => [
        { service_type: { contains: term, mode: 'insensitive' } },
        { job: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ]);

      const count = await this.prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          offer_service: true,
          city: { contains: city, mode: 'insensitive' },
          OR: tradeFilters,
        },
      });

      return { service: query.service.trim(), city, count };
    } catch (err) {
      throw err;
    }
  }

  /**
   * The searched trade and the variants of its taxonomy trade(s) (métier), in every language,
   * without duplicates. A word the taxonomy does not know is searched as typed.
   */
  tradeTerms(service: string): string[] {
    const typed = service.trim();
    const terms = new Set<string>([typed]);
    for (const concept of lookupConcept(typed)) {
      if (concept.tagType !== 'métier') continue;
      for (const variant of CONCEPTS_CATALOG[concept.conceptId]?.variants ?? []) {
        terms.add(variant.tag);
      }
    }
    return [...terms].filter((term) => term.length >= 2).slice(0, MAX_TRADE_TERMS);
  }
}
