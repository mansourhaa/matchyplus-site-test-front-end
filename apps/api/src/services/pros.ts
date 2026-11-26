import { type Redis } from 'ioredis';
import { createHash } from 'node:crypto';

import { Prisma, PrismaClient, UserStatus } from '@saas-boilerplate/types';

import {
  PRO_COUNT_CACHE_TTL_SECONDS,
  PRO_COUNT_MAX_TRADE_TERMS,
  PRO_COUNT_MIN_TERM_LENGTH,
} from '../constants.js';
import { CONCEPTS_CATALOG, lookupConcept } from '../taxonomy/index.js';
import { ProCountQuery, ProCountResponse, ProsServiceOptions } from '../types/pros.js';

/**
 * Public counts for the landing site's search page. Only numbers leave this service: no names,
 * photos or ids, so the endpoint can stay unauthenticated.
 */
export class ProsService {
  prisma: PrismaClient;
  redis: Redis | null;

  constructor(options: ProsServiceOptions) {
    this.prisma = options.prisma;
    this.redis = options.redis;
  }

  /**
   * Active users who offer a service, whose trade (`service_type`, `job` or `category`) contains
   * one of the searched trade's words, and whose `city` is exactly the searched city
   * (case-insensitive, so "Tunis" does not count "Tunisie"). The trade is widened to all its
   * taxonomy variants, so "plombier", "plumber" and "سباك" find the same people.
   *
   * Each count is cached in Redis for PRO_COUNT_CACHE_TTL_SECONDS: the same search reaches the
   * database at most once per TTL. Without Redis (or if Redis fails) the database answers.
   */
  async count(query: ProCountQuery): Promise<ProCountResponse> {
    try {
      const service = query.service.trim();
      const city = query.city.trim();
      const key = this.cacheKey(service, city);

      const cached = await this.readCache(key);
      if (cached !== null) return { service, city, count: cached };

      const terms = this.tradeTerms(service);
      const count = terms.length === 0 ? 0 : await this.countInDatabase(terms, city);
      await this.writeCache(key, count);
      return { service, city, count };
    } catch (err) {
      throw err;
    }
  }

  /**
   * The searched trade and the variants of its taxonomy trade(s) (métier), in every language,
   * without duplicates. Words shorter than PRO_COUNT_MIN_TERM_LENGTH are dropped (they would
   * match almost any profile); a word the taxonomy does not know is searched as typed.
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
    return [...terms]
      .filter((term) => term.length >= PRO_COUNT_MIN_TERM_LENGTH)
      .slice(0, PRO_COUNT_MAX_TRADE_TERMS);
  }

  /** One key per search, whatever its case or spacing; hashed so any input gives a short key. */
  cacheKey(service: string, city: string): string {
    const search = `${service.toLowerCase()}|${city.toLowerCase()}`;
    return `pros:count:v1:${createHash('sha256').update(search).digest('hex').slice(0, 32)}`;
  }

  private async countInDatabase(terms: string[], city: string): Promise<number> {
    try {
      const tradeFilters: Prisma.UserWhereInput[] = terms.flatMap((term) => [
        { service_type: { contains: term, mode: 'insensitive' } },
        { job: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ]);
      return await this.prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          offer_service: true,
          city: { equals: city, mode: 'insensitive' },
          OR: tradeFilters,
        },
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * The cached count, or null. The cache only spares the database: if Redis fails, the count is
   * read from the database instead of failing the visitor's request.
   */
  private async readCache(key: string): Promise<number | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      const value = raw === null ? NaN : Number(raw);
      return Number.isInteger(value) && value >= 0 ? value : null;
    } catch {
      return null;
    }
  }

  /** Best effort, like readCache: a Redis failure must not fail a count already computed. */
  private async writeCache(key: string, count: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, String(count), 'EX', PRO_COUNT_CACHE_TTL_SECONDS);
    } catch {
      // the next request reads the database again
    }
  }
}
