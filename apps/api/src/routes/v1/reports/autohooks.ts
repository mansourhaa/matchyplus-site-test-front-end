import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  // Filing a report requires being logged in, but not being an admin.
  fastify.addHook('preHandler', fastify.verifyToken);
}
