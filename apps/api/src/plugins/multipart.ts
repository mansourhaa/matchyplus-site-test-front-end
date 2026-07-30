import multipart, { FastifyMultipartOptions } from '@fastify/multipart';
import fp from 'fastify-plugin';

/**
 * Fastify plugin to parse the multipart content-type.
 *
 * @see https://github.com/fastify/fastify-multipart
 */
export default fp<FastifyMultipartOptions>(
  async (fastify) => {
    fastify.register(multipart, {
      attachFieldsToBody: true,
      // Global ceiling covers the largest consumer (profile video, 50MB) — stricter
      // per-upload-type limits (e.g. 8MB for photos) are enforced in ProfileService
      // itself, since attachFieldsToBody mode buffers the whole field before a route
      // handler can apply a smaller limit.
      limits: { fileSize: 50 * 1024 * 1024 },
    });
  },
  {
    name: 'multipart',
  },
);
