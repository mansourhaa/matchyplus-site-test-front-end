export const loginSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email', lowercase: true, trim: true },
      password: { type: 'string', format: 'password' },
    },
    required: ['email', 'password'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
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
  },
};
export const authCheckSchema = {
  tags: ['auth'],
  headers: {
    type: 'object',
    properties: {
      Authorization: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            id: { type: 'string' },
          },
        },
      },
    },
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
  },
};

const userSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    phone: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
  },
};

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

const tokenPairResponseSchema = {
  type: 'object',
  properties: {
    access_token: { type: 'string' },
    refresh_token: { type: 'string' },
    user: userSummarySchema,
  },
};

export const sendOtpSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', minLength: 6, maxLength: 20 },
    },
    required: ['phone'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: { type: 'string' },
        phone: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

export const verifyOtpSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', minLength: 6, maxLength: 20 },
      code: { type: 'string', minLength: 4, maxLength: 10 },
    },
    required: ['phone', 'code'],
  },
  response: {
    200: {
      description: 'Successful response',
      ...tokenPairResponseSchema,
    },
    ...errorResponses,
  },
};

export const loginPhoneSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', minLength: 6, maxLength: 20 },
      password: { type: 'string', format: 'password' },
    },
    required: ['phone', 'password'],
  },
  response: {
    200: {
      description: 'Successful response',
      ...tokenPairResponseSchema,
    },
    ...errorResponses,
  },
};

export const registerPhoneSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', minLength: 6, maxLength: 20 },
      password: { type: 'string', format: 'password', minLength: 6 },
      code: { type: 'string', minLength: 4, maxLength: 10 },
      name: { type: 'string' },
    },
    required: ['phone', 'password', 'code'],
  },
  response: {
    201: {
      description: 'Successful response',
      ...tokenPairResponseSchema,
    },
    ...errorResponses,
  },
};

export const refreshSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      refresh_token: { type: 'string' },
    },
    required: ['refresh_token'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

export const requestPasswordResetSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', minLength: 6, maxLength: 20 },
    },
    required: ['phone'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: { type: 'string' },
        phone: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

export const confirmPasswordResetSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      phone: { type: 'string', minLength: 6, maxLength: 20 },
      code: { type: 'string', minLength: 4, maxLength: 10 },
      newPassword: { type: 'string', format: 'password', minLength: 6 },
    },
    required: ['phone', 'code', 'newPassword'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

export const changePasswordSchema = {
  tags: ['auth'],
  headers: {
    type: 'object',
    properties: {
      Authorization: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      currentPassword: { type: 'string', format: 'password' },
      newPassword: { type: 'string', format: 'password', minLength: 6 },
    },
    required: ['currentPassword', 'newPassword'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: { type: 'string' },
        forceLogout: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
};

export const registerSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' },
    },
    required: ['email', 'password'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
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
  },
};
