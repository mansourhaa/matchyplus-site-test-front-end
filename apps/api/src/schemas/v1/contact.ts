import { FastifySchema } from 'fastify';

export const sendContactEmailSchema: FastifySchema = {
  tags: ['contact'],
  summary: 'Send contact or partner application email to administrators',
  description:
    'Accepts visitor contact messages or partner applications, renders a template, and dispatches via Brevo SMTP to hello@matchy.tn.',
  body: {
    type: 'object',
    required: ['name', 'email'],
    additionalProperties: false,
    properties: {
      type: {
        type: 'string',
        enum: ['contact', 'partner', 'custom'],
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 120,
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 180,
      },
      phone: {
        type: 'string',
        maxLength: 40,
      },
      requestText: {
        type: 'string',
        maxLength: 3000,
      },
      message: {
        type: 'string',
        maxLength: 3000,
      },
      activity: {
        type: 'string',
        maxLength: 150,
      },
      city: {
        type: 'string',
        maxLength: 100,
      },
      subject: {
        type: 'string',
        maxLength: 200,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success'],
      additionalProperties: false,
      properties: {
        success: { type: 'boolean' },
        messageId: { type: 'string' },
        simulated: { type: 'boolean' },
      },
    },
    400: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
        errors: { type: 'array' },
      },
    },
    500: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
      },
    },
  },
};
