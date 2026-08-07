import { parseArgs } from 'node:util';

import { prisma } from '../index.js';
import seedDev from './development.js';
import seedProd from './production.js';
import seedStaging from './staging.js';

const options: { environment: { type: 'string' } } = {
  environment: { type: 'string' },
};

async function main() {
  const {
    values: { environment },
  } = parseArgs({ options });
  // `prisma db seed` runs this script with no arguments, so `--environment` is almost never
  // present; NODE_ENV (set by the per-environment dotenv file) is the real signal. Falling back
  // to the development seed here is what used to leak the demo admin accounts into staging and
  // production, so an unknown environment must refuse to seed instead.
  const target = environment ?? process.env['NODE_ENV'];
  switch (target) {
    case 'production':
      /** data for your production */
      await seedProd();
      break;
    case 'staging':
      /** data for your staging */
      await seedStaging();
      break;
    case 'development':
      /** data for your development */
      await seedDev();
      break;
    default:
      throw new Error(
        `Refusing to seed: unknown environment "${target ?? 'undefined'}". ` +
          'Set NODE_ENV or pass --environment=development|staging|production.',
      );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
