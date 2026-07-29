export const adminLoginSchema = {
  tags: ['auth', 'admin'],
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
      description: 'Successful response. The token is returned as an HttpOnly cookie, not here.',
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            id: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
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

export const adminLogoutSchema = {
  tags: ['auth', 'admin'],
  response: {
    200: {
      description: 'Session cookie cleared',
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
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
            id: { type: 'string' },
            email: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            name: { type: 'string' },
            auth_provider: { type: 'string' },
            email_verified: { type: 'boolean' },
            role: { type: 'string' },
            onboarding_completed: { type: 'boolean' },
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
    // A phone-only account has no email, and vice versa for OAuth-only — without
    // `nullable: true` the serializer silently coerces a real `null` to `""` on the wire.
    phone: { type: 'string', nullable: true },
    email: { type: 'string', nullable: true },
    name: { type: 'string' },
    auth_provider: { type: 'string' },
    email_verified: { type: 'boolean' },
    onboarding_completed: { type: 'boolean' },
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

// Neither token is ever returned in a JSON body — both go out as HttpOnly cookies the
// browser attaches automatically (see utils/member-session.ts).
const userOnlyResponseSchema = {
  type: 'object',
  properties: {
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
      description:
        'Proves phone ownership only — never a login or account-creation result. ' +
        'register-phone consumes signup_token to actually create the account.',
      type: 'object',
      properties: {
        verified: { type: 'boolean' },
        phone: { type: 'string' },
        signupToken: { type: 'string' },
      },
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
      ...userOnlyResponseSchema,
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
      signupToken: { type: 'string', minLength: 16 },
      name: { type: 'string' },
    },
    required: ['phone', 'password', 'signupToken'],
  },
  response: {
    201: {
      description: 'Successful response',
      ...userOnlyResponseSchema,
    },
    ...errorResponses,
  },
};

// The refresh token is read from an HttpOnly cookie, never the body (see
// utils/member-session.ts) — this route takes no input of its own.
export const refreshSchema = {
  tags: ['auth'],
  response: {
    200: {
      description: 'Successful response. Both tokens are rotated as HttpOnly cookies.',
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
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

const authenticatedHeadersSchema = {
  type: 'object',
  properties: {
    Authorization: { type: 'string' },
  },
};

export const requestPhoneLinkSchema = {
  tags: ['auth'],
  headers: authenticatedHeadersSchema,
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

export const confirmPhoneLinkSchema = {
  tags: ['auth'],
  headers: authenticatedHeadersSchema,
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
      type: 'object',
      properties: {
        message: { type: 'string' },
        phone: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

export const deleteAccountSchema = {
  tags: ['auth'],
  headers: authenticatedHeadersSchema,
  body: {
    type: 'object',
    properties: {
      confirm: { type: 'boolean' },
      currentPassword: { type: 'string' },
      reason: { type: 'string', maxLength: 500 },
    },
    required: ['confirm'],
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

export const oauthExchangeSchema = {
  tags: ['auth'],
  body: {
    type: 'object',
    properties: {
      code: { type: 'string', minLength: 16 },
    },
    required: ['code'],
  },
  response: {
    200: {
      description: 'Successful response',
      ...userOnlyResponseSchema,
    },
    ...errorResponses,
  },
};
