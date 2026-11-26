import { FastifySchema } from 'fastify';

export const proCountSchema: FastifySchema = {
  tags: ['pros'],
  summary: 'Count the professionals offering a trade in a city',
  description:
    'Public, for the landing search page ("35 plombiers disponibles à Sousse"). Counts active users who offer a service, whose trade matches the searched one in any taxonomy language, and whose city matches. Returns a number only: no profile data.',
  querystring: {
    type: 'object',
    required: ['service', 'city'],
    additionalProperties: false,
    properties: {
      service: { type: 'string', minLength: 2, maxLength: 80 },
      city: { type: 'string', minLength: 2, maxLength: 80 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['service', 'city', 'count'],
      additionalProperties: false,
      properties: {
        service: { type: 'string' },
        city: { type: 'string' },
        count: { type: 'integer', minimum: 0 },
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
    429: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
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
