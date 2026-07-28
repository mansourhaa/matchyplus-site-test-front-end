export const swipeFeedQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      limit: { type: 'integer', minimum: 1, maximum: 50 },
    },
  },
};

export const postSwipeSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['target_user_id', 'direction'],
    properties: {
      target_user_id: { type: 'string', minLength: 1 },
      direction: { type: 'string', enum: ['left', 'right'] },
    },
  },
};

export const targetUserParamsSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['userId'],
    properties: {
      userId: { type: 'string', minLength: 1 },
    },
  },
};
