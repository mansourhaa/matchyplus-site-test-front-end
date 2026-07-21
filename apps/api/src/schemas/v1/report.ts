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

const reportStatusEnum = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];

const reportParty = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    image: { type: 'string', nullable: true },
    status: { type: 'string' },
    city: { type: 'string', nullable: true },
    job: { type: 'string', nullable: true },
  },
};

const report = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    reason: { type: 'string' },
    details: { type: 'string', nullable: true },
    status: { type: 'string' },
    create_at: { type: 'string' },
    updated_at: { type: 'string' },
    reporter: reportParty,
    reported: reportParty,
  },
};

export const createReportSchema = {
  tags: ['reports'],
  params: {
    type: 'object',
    properties: { reportedId: { type: 'string' } },
    required: ['reportedId'],
  },
  body: {
    type: 'object',
    properties: {
      reason: { type: 'string', minLength: 1 },
      details: { type: 'string' },
    },
    required: ['reason'],
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { report },
    },
    ...errorResponses,
  },
};

export const adminListReportsSchema = {
  tags: ['admin', 'reports'],
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: reportStatusEnum },
      reportedId: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        reports: { type: 'array', items: report },
      },
    },
    ...errorResponses,
  },
};

export const adminReportSummarySchema = {
  tags: ['admin', 'reports'],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        summary: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              reported: reportParty,
              total: { type: 'number' },
              pending: { type: 'number' },
            },
          },
        },
      },
    },
    ...errorResponses,
  },
};

export const adminUpdateReportSchema = {
  tags: ['admin', 'reports'],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: reportStatusEnum },
    },
    required: ['status'],
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { report },
    },
    ...errorResponses,
  },
};
