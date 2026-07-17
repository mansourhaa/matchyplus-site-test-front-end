import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { createOtpClient } from '../lib/twilio.js';

export declare type FastifyTwilioOptions = {};

//Add the OTP client instance to fastify
async function fastifyTwilio(fastify: FastifyInstance, options: FastifyTwilioOptions) {
  fastify.decorate('otpClient', createOtpClient());
}
export default fp(fastifyTwilio, {
  name: 'twilio',
});
