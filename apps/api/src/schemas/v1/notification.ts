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
    type: {
      type: 'string',
      enum: ['PROFILE_VIEW', 'MATCH', 'MATCH_REQUEST', 'MESSAGE'],
    },
    data: { type: 'object', additionalProperties: true },
    read: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
  },
};

const notificationPreferences = {
  type: 'object',
  properties: {
    all_enabled: { type: 'boolean' },
    matches: { type: 'boolean' },
    messages: { type: 'boolean' },
    views: { type: 'boolean' },
    email: { type: 'boolean' },
  },
  additionalProperties: false,
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

export const getNotificationPreferencesSchema = {
  tags: ['notifications'],
  summary: "Get the current user's notification preferences",
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        preferences: notificationPreferences,
      },
      additionalProperties: false,
    },
    ...errorResponses,
  },
};

export const updateNotificationPreferencesSchema = {
  tags: ['notifications'],
  summary: "Update the current user's notification preferences (partial)",
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  body: {
    type: 'object',
    properties: {
      all_enabled: { type: 'boolean' },
      matches: { type: 'boolean' },
      messages: { type: 'boolean' },
      views: { type: 'boolean' },
      email: { type: 'boolean' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        preferences: notificationPreferences,
      },
      additionalProperties: false,
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
