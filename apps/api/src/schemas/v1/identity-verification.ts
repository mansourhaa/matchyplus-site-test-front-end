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

const authenticatedHeadersSchema = {
  type: 'object',
  properties: {
    Authorization: { type: 'string' },
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

export const submitIdentitySelfieSchema = {
  tags: ['identity-verification'],
  summary: "Submit a live selfie to verify the current user's identity against their profile photo",
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  consumes: ['multipart/form-data'],
  response: {
    202: {
      description: 'Job queued',
      type: 'object',
      properties: {
        job: aiJobSchema,
      },
    },
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

export const getLatestIdentityVerificationSchema = {
  tags: ['identity-verification'],
  summary: "Read the current user's most recent identity-verification attempt",
  description:
    'Returns the latest VERIFY_IDENTITY job for the caller, or null when they have never ' +
    'submitted one. Lets a client that lost the job id — a poll loop that timed out, a ' +
    'reload — recover the outcome instead of stranding a finished job.',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        job: { ...aiJobSchema, nullable: true },
        identityVerified: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
};

export const getIdentityVerificationStatusSchema = {
  tags: ['identity-verification'],
  summary: 'Poll the status of a submitted identity-verification job',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['jobId'],
    properties: {
      jobId: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        job: aiJobSchema,
        identityVerified: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
};
