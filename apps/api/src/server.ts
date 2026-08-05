import { ajvFilePlugin } from '@fastify/multipart';
import ajvFormat from 'ajv-formats';
import { FastifyServerOptions, fastify } from 'fastify';

export async function createServerApp(opts: FastifyServerOptions = {}) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const app = fastify({
    // Nginx Ingress / reverse proxies set X-Forwarded-For; required for accurate
    // request.ip (rate limits + IP geolocation fallback for discovery).
    trustProxy: opts.trustProxy ?? true,
    logger: opts.logger ?? (isDevelopment ? false : true),
    pluginTimeout: opts.pluginTimeout ?? 20000,
    ajv: opts.ajv ?? {
      customOptions: {
        allowUnionTypes: true,
        strict: false,
      },
      plugins: [ajvFormat as never, ajvFilePlugin as never],
    },
    ...opts,
  });

  await app.register(import('./app.js'));

  return app;
}
