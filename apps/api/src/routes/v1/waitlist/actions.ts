import { FastifyPluginAsync } from 'fastify';

import { waitlistSendOtpSchema, waitlistVerifyOtpSchema } from '../../../schemas/v1/waitlist.js';
import { WaitlistService } from '../../../services/waitlist.js';

const OTP_SEND_RATE_LIMIT = { max: 5, timeWindow: '15 minutes' };
const OTP_VERIFY_RATE_LIMIT = { max: 10, timeWindow: '15 minutes' };

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const waitlist = new WaitlistService({
    prisma: fastify.prisma,
    smsClient: fastify.smsClient,
  });

  fastify.post(
    '/send-otp',
    {
      schema: waitlistSendOtpSchema,
      config: { rateLimit: OTP_SEND_RATE_LIMIT },
    },
    async (request, reply) => {
      const body = request.body as { phone: unknown; name: unknown; occupation: unknown };
      const result = await waitlist.sendOtp(body);
      return reply.code(200).send(result);
    },
  );

  fastify.post(
    '/verify-otp',
    {
      schema: waitlistVerifyOtpSchema,
      config: { rateLimit: OTP_VERIFY_RATE_LIMIT },
    },
    async (request, reply) => {
      const body = request.body as { phone?: unknown; code?: unknown; otp?: unknown };
      const result = await waitlist.verifyOtp({
        phone: body.phone,
        code: body.code ?? body.otp,
      });
      return reply.code(200).send(result);
    },
  );
};

export default routes;
