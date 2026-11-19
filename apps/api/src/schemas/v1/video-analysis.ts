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

const aiJobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    status: {
      type: 'string',
      enum: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
    },
    result: { type: ['object', 'null'], additionalProperties: true },
    error: { type: ['string', 'null'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

const tokenJobSchema = {
  description: 'Job queued',
  type: 'object',
  properties: {
    job: aiJobSchema,
    token: { type: 'string', description: 'Needed to read the result; keep it in memory only.' },
  },
};

export const startOnboardingVideoAnalysisSchema = {
  tags: ['video-analysis'],
  summary: 'Analyse the onboarding video to pre-fill the signup form (no account needed)',
  description:
    'Multipart: `video` (the clip just recorded) and optional `uiLocale` (fr, ar, en). ' +
    'Queues an ANALYZE_VIDEO job on a private copy that the worker deletes after the ' +
    'analysis. The result holds suggested form fields in the requested language. Poll it ' +
    'with GET /onboarding/video-analysis/{jobId}?token=…',
  consumes: ['multipart/form-data'],
  response: {
    202: tokenJobSchema,
    503: {
      description: 'AI queue unavailable',
      type: 'object',
      properties: {
        status: { type: 'number' },
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

export const getOnboardingVideoAnalysisSchema = {
  tags: ['video-analysis'],
  summary: 'Poll an onboarding video analysis job',
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['jobId'],
    properties: {
      jobId: { type: 'string', maxLength: 64 },
    },
  },
  querystring: {
    type: 'object',
    additionalProperties: false,
    required: ['token'],
    properties: {
      token: { type: 'string', minLength: 16, maxLength: 128 },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        job: aiJobSchema,
      },
    },
    ...errorResponses,
  },
};

const relabelFieldKeys = [
  'first_name',
  'last_name',
  'profession',
  'city',
  'bio',
  'years_experience',
  'availability',
];

const relabelledFieldSchema = {
  type: 'object',
  properties: {
    value: { type: ['string', 'null'] },
    review: { type: 'boolean' },
  },
};

const relabelOptionsSchema = {
  type: 'array',
  maxItems: 5,
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      value: { type: 'string', maxLength: 300 },
      label: { type: 'string', maxLength: 300 },
    },
  },
};

export const relabelOnboardingFieldsSchema = {
  tags: ['video-analysis'],
  summary:
    'Rewrite the AI-filled signup fields in another page language (no AI, dictionaries only)',
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['values', 'uiLocale'],
    properties: {
      values: {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(
          relabelFieldKeys.map((key) => [key, { type: 'string', maxLength: 300 }]),
        ),
      },
      uiLocale: { type: 'string', enum: ['fr', 'ar', 'en'] },
      serviceId: { type: ['string', 'null'], maxLength: 80, pattern: '^[a-z0-9_.-]*$' },
      aiFields: {
        type: 'array',
        maxItems: relabelFieldKeys.length,
        items: { type: 'string', enum: relabelFieldKeys },
      },
      suggestions: {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(relabelFieldKeys.map((key) => [key, relabelOptionsSchema])),
      },
    },
  },
  response: {
    200: {
      description: 'Fields in the requested language',
      type: 'object',
      properties: {
        fields: {
          type: 'object',
          properties: Object.fromEntries(
            relabelFieldKeys.map((key) => [key, relabelledFieldSchema]),
          ),
        },
        suggestions: {
          type: 'object',
          properties: Object.fromEntries(
            relabelFieldKeys.map((key) => [key, relabelOptionsSchema]),
          ),
        },
        serviceId: { type: ['string', 'null'] },
      },
    },
    503: {
      description: 'Voice service unavailable',
      type: 'object',
      properties: {
        status: { type: 'number' },
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};
