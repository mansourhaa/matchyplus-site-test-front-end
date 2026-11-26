import { type Redis } from 'ioredis';

import { AbstractServiceOptions } from './services.js';

/** Query of GET /api/v1/pros/count: what the visitor searched on the landing site. */
export type ProCountQuery = {
  /** The trade, in any language the taxonomy knows ("Plombier", "plumber", "سباك"). */
  service: string;
  /** The city, matched exactly (case-insensitive): "Sousse" does not match "Sousse Riadh". */
  city: string;
};

export type ProCountResponse = {
  service: string;
  city: string;
  /** Active professionals offering this trade in this city. */
  count: number;
};

/** ProsService needs the database and, when configured, Redis for the count cache. */
export type ProsServiceOptions = AbstractServiceOptions & {
  redis: Redis | null;
};
