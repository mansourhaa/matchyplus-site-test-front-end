import helmet, { FastifyHelmetOptions } from '@fastify/helmet';
import fp from 'fastify-plugin';

/**
 * Important security headers for Fastify. It is a tiny wrapper around helmet.
 *
 * @see https://github.com/fastify/fastify-helmet
 */
export default fp(
  async (fastify) => {
    await fastify.register(helmet, {
      //@ts-ignore
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Unsafe-eval is required for vue3 / vue-i18n / app extensions
          scriptSrc: ["'self'", "'unsafe-eval'"],

          // Even though this is recommended to have enabled, it breaks most local
          // installations. Making this opt-in rather than opt-out is a little more
          // friendly. Ref #10806
          upgradeInsecureRequests: null,

          // These are required for MapLibre
          workerSrc: ["'self'", 'blob:'],
          childSrc: ["'self'", 'blob:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'"],
          connectSrc: ["'self'", 'https://*'],
        },
      },
      // Profile photos and presentation videos are served by this API but
      // rendered by the front ends on app.matchyplus.com and admin.matchyplus.com.
      // helmet defaults this header to "same-origin", which tells the browser to
      // refuse the file whenever the page requesting it is on a different origin -
      // so every video failed in production with
      //   net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
      // while the upload itself had succeeded and the file was on disk.
      //
      // "same-site" rather than "cross-origin": app/admin/api all share the
      // registrable domain matchyplus.com, so this permits our own front ends and
      // still refuses arbitrary third-party sites hotlinking user media.
      crossOriginResourcePolicy: { policy: 'same-site' },
      xContentTypeOptions: false,
    });
  },
  {
    name: 'helmet',
    dependencies: ['swagger', 'swagger-ui'],
  },
);
