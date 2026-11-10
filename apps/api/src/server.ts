import { ajvFilePlugin } from '@fastify/multipart';
import ajvFormat from 'ajv-formats';
import { FastifyServerOptions, fastify } from 'fastify';

export async function createServerApp(opts: FastifyServerOptions = {}) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  // Only honor X-Forwarded-For when explicitly enabled (staging/prod behind Ingress).
  // Default false so direct clients cannot spoof request.ip for rate limits / IP geo.
  const trustProxyEnv = process.env.TRUST_PROXY?.trim().toLowerCase();
  const trustProxyFromEnv = trustProxyEnv === 'true' || trustProxyEnv === '1';

  const app = fastify({
    bodyLimit: opts.bodyLimit ?? 15 * 1024 * 1024,
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
    // After `...opts` so the env/default wins unless the caller sets opts.trustProxy.
    trustProxy: opts.trustProxy ?? trustProxyFromEnv,
  });

  await app.register(import('./app.js'));

  return app;
}
