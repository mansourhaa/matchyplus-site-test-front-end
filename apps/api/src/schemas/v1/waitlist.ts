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

const waitlistSendBody = {
  type: 'object',
  additionalProperties: false,
  required: ['phone', 'name', 'occupation'],
  properties: {
    phone: { type: 'string' },
    name: { type: 'string' },
    occupation: { type: 'string' },
  },
};

const waitlistVerifyBody = {
  type: 'object',
  additionalProperties: false,
  required: ['phone'],
  properties: {
    phone: { type: 'string' },
    code: { type: 'string' },
    otp: { type: 'string' },
  },
};

export const waitlistSendOtpSchema = {
  tags: ['waitlist'],
  summary: 'Send waitlist OTP',
  description: 'Starts early-access waitlist signup by SMS-verifying the phone number.',
  body: waitlistSendBody,
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        devCode: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

export const waitlistVerifyOtpSchema = {
  tags: ['waitlist'],
  summary: 'Verify waitlist OTP',
  description: 'Confirms the SMS code and commits the waitlist entry.',
  body: waitlistVerifyBody,
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        entry: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            name: { type: 'string' },
            occupation: { type: 'string' },
          },
        },
      },
    },
    ...errorResponses,
  },
};
