import { FastifySchema } from 'fastify';

/** Same error shape as the other routes (plugins/error-handler.ts sends status, code, message). */
const errorResponses = {
  '4xx': {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string' },
      message: { type: 'string' },
    },
  },
  500: {
    description: 'Error response',
    type: 'object',
    properties: {
      status: { type: 'number', default: 500 },
      code: { type: 'string' },
      message: { type: 'string' },
    },
  },
};

export const proCountSchema: FastifySchema = {
  tags: ['pros'],
  summary: 'Count the professionals offering a trade in a city',
  description:
    'Public, for the landing search page ("35 plombiers disponibles à Sousse"). Counts active users who offer a service, whose trade matches the searched one in any taxonomy language, and whose city is exactly the searched city (case-insensitive). Returns a number only: no profile data. Rate-limited per visitor and cached in Redis.',
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
    ...errorResponses,
  },
};
