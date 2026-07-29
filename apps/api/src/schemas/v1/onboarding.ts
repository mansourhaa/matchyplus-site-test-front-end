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

const onboardingProfileResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    auth_provider: { type: 'string' },
    job: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    image: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    profile_type: { type: 'string', enum: ['INDIVIDUAL', 'PROVIDER'], nullable: true },
    offer_service: { type: 'boolean' },
    service_type: { type: 'string', nullable: true },
    price: { type: 'string', nullable: true },
    interests: { type: 'array', items: { type: 'string' } },
    selected_goals: { type: 'array', items: { type: 'string' } },
    availability_days: { type: 'array', items: { type: 'string' } },
    availability_hours: { type: 'array', items: { type: 'string' } },
    contact_modes: { type: 'array', items: { type: 'string' } },
    languages: { type: 'array', items: { type: 'string' } },
    onboardingCompleted: { type: 'boolean' },
  },
};

export const getOnboardingProfileSchema = {
  tags: ['onboarding'],
  summary: "Get the current user's onboarding profile",
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: {
    200: {
      description: 'Successful response',
      ...onboardingProfileResponseSchema,
    },
    ...errorResponses,
  },
};

export const updateOnboardingProfileSchema = {
  tags: ['onboarding'],
  summary: 'Partially save the current onboarding step',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      job: { type: 'string' },
      bio: { type: 'string', maxLength: 250 },
      image: { type: 'string' },
      city: { type: 'string' },
      profileType: { type: 'string', enum: ['INDIVIDUAL', 'PROVIDER'] },
      offerService: { type: 'boolean' },
      serviceType: { type: 'string' },
      price: { type: 'string' },
      interests: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      selectedGoals: { type: 'array', items: { type: 'string' } },
      availabilityDays: { type: 'array', items: { type: 'string' } },
      availabilityHours: { type: 'array', items: { type: 'string' } },
      contactModes: { type: 'array', items: { type: 'string' } },
      languages: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      ...onboardingProfileResponseSchema,
    },
    ...errorResponses,
  },
};

export const completeOnboardingSchema = {
  tags: ['onboarding'],
  summary: 'Mark onboarding complete once all required fields are present',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: {
    200: {
      description: 'Successful response',
      ...onboardingProfileResponseSchema,
    },
    ...errorResponses,
  },
};
