import { prisma } from '../client.js';
import { seedPlans } from './plans.js';

/**
 * No sample users: staging shares the production shape. Plans are the exception — they are
 * configuration the admin panel needs, so they are upserted here for anyone running
 * `db:seed:staging` by hand. The deploy pipeline never seeds, so the same rows are also
 * inserted by the `seed_default_plans` migration.
 */
export default async function seedStaging() {
  await seedPlans(prisma);
}
