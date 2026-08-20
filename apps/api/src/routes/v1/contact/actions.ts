import { FastifyPluginAsync } from 'fastify';

import { sendContactEmailSchema } from '../../../schemas/v1/contact.js';
import { EmailService } from '../../../services/email.js';
import { SendContactEmailBody, SendContactEmailResponse } from '../../../types/contact.js';

const CONTACT_RATE_LIMIT = { max: 10, timeWindow: '1 hour' };

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const emailService = new EmailService();

  fastify.post<{ Body: SendContactEmailBody; Reply: SendContactEmailResponse }>(
    '/',
    {
      schema: sendContactEmailSchema,
      config: { rateLimit: CONTACT_RATE_LIMIT },
    },
    async (request, reply) => {
      try {
        const result = await emailService.sendContactMessage(request.body);
        return reply.code(200).send(result);
      } catch (err) {
        throw err;
      }
    },
  );
};

export default routes;
