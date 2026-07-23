import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.verifyToken);
  fastify.addHook('preHandler', fastify.verifyAdmin);
}
