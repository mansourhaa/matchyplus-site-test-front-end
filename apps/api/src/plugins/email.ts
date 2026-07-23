import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createEmailClient } from '../lib/email.js';

async function fastifyEmail(fastify: FastifyInstance) {
  fastify.decorate('emailClient', createEmailClient());
}
export default fp(fastifyEmail, {
  name: 'email',
});
