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

const notificationRow = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['PROFILE_VIEW'] },
    data: { type: 'object', additionalProperties: true },
    read: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
  },
};

export const listNotificationsSchema = {
  tags: ['notifications'],
  summary: "List the current user's notifications, most recent first",
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        notifications: { type: 'array', items: notificationRow },
        unread_count: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

const markedResponseSchema = {
  200: {
    description: 'Successful response',
    type: 'object',
    properties: {
      marked: { type: 'boolean' },
    },
  },
  ...errorResponses,
};

export const markNotificationReadSchema = {
  tags: ['notifications'],
  summary: 'Mark a single notification as read',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: markedResponseSchema,
};

export const markAllNotificationsReadSchema = {
  tags: ['notifications'],
  summary: 'Mark every notification for the current user as read',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: markedResponseSchema,
};
