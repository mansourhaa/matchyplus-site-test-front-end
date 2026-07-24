import cors, { FastifyCorsOptions } from '@fastify/cors';
import fp from 'fastify-plugin';

/**
 * enables the use of CORS in a Fastify application.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp<FastifyCorsOptions>(
  async (fastify) => {
    // Without an explicit `origin`, @fastify/cors reflects whatever Origin the caller sends,
    // which lets any site on the internet call the API from a logged-in admin's browser.
    // CORS_ORIGINS pins that down to the deployed frontends.
    const allowedOrigins = (process.env['CORS_ORIGINS'] ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    // Only a developer machine gets the permissive reflection. Anywhere else an unset
    // CORS_ORIGINS is a misconfiguration, and the app refuses to boot rather than starting
    // wide open — the same fail-fast the required variables in config.ts already use, so a
    // deployment with NODE_ENV unset or mistyped is caught instead of silently allowed.
    if (allowedOrigins.length === 0) {
      if (process.env['NODE_ENV'] !== 'development') {
        throw new Error(
          'Missing required environment variable: CORS_ORIGINS ' +
            '(required outside NODE_ENV=development, otherwise every origin is reflected)',
        );
      }
      fastify.log.warn('CORS_ORIGINS is unset: reflecting every origin (development only)');
    }

    fastify.register(cors, {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      // Defaults to GET,HEAD,POST only, which fails preflight for every write route.
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      // The admin panel authenticates with an HttpOnly cookie, which a cross-origin request
      // only carries when credentials are allowed. Safe because the origin is now an explicit
      // allowlist everywhere it matters — the pairing of `credentials` with a reflected origin
      // is what makes that combination dangerous.
      credentials: true,
    });
  },
  {
    name: 'cors',
  },
);
