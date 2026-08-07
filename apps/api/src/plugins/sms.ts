import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createSmsClient } from '../lib/sms.js';

export declare type FastifySmsOptions = {};

// Add the SMS client instance to fastify
async function fastifySms(fastify: FastifyInstance, options: FastifySmsOptions) {
  fastify.decorate('smsClient', createSmsClient());
}
export default fp(fastifySms, {
  name: 'sms',
});
