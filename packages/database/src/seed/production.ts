import { prisma } from '../client.js';
import { seedPlans } from './plans.js';

/**
 * Production gets configuration only, never sample data. Plans are upserted so a manual
 * `db:seed:prod` is not a no-op; the same rows are inserted by the `seed_default_plans`
 * migration, which is what the deploy pipeline actually runs.
 */
export default async function seedProd() {
  await seedPlans(prisma);
}
