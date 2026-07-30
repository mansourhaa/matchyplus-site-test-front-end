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

const profileExperienceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'company', 'type', 'startDate', 'endDate', 'current'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 100 },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    company: { type: 'string', maxLength: 120 },
    type: { type: 'string', maxLength: 60 },
    startDate: { type: 'string', maxLength: 7 },
    endDate: { type: 'string', maxLength: 7 },
    current: { type: 'boolean' },
  },
};

const profileEducationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'school', 'degree', 'field', 'startDate', 'endDate', 'result'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 100 },
    school: { type: 'string', minLength: 1, maxLength: 160 },
    degree: { type: 'string', maxLength: 120 },
    field: { type: 'string', maxLength: 120 },
    startDate: { type: 'string', maxLength: 7 },
    endDate: { type: 'string', maxLength: 7 },
    result: { type: 'string', maxLength: 120 },
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
    video: { type: 'string', nullable: true },
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
    experience: { type: 'string', nullable: true },
    sector: { type: 'string', nullable: true },
    education_level: { type: 'string', nullable: true },
    experiences: {
      anyOf: [{ type: 'array', items: profileExperienceSchema }, { type: 'null' }],
    },
    educations: {
      anyOf: [{ type: 'array', items: profileEducationSchema }, { type: 'null' }],
    },
    rating: { type: 'number' },
    reviews: { type: 'number' },
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
      name: { type: 'string', minLength: 1, maxLength: 120 },
      job: { type: 'string', maxLength: 120 },
      bio: { type: 'string', maxLength: 250 },
      image: { type: 'string' },
      city: { type: 'string', maxLength: 120 },
      profileType: { type: 'string', enum: ['INDIVIDUAL', 'PROVIDER'] },
      offerService: { type: 'boolean' },
      serviceType: { type: 'string', maxLength: 120 },
      price: { type: 'string', maxLength: 40 },
      interests: {
        type: 'array',
        items: { type: 'string', minLength: 1, maxLength: 60 },
        maxItems: 5,
        uniqueItems: true,
      },
      selectedGoals: {
        type: 'array',
        items: { type: 'string', minLength: 1, maxLength: 100 },
        maxItems: 20,
        uniqueItems: true,
      },
      availabilityDays: {
        type: 'array',
        items: { type: 'string', enum: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] },
        maxItems: 7,
        uniqueItems: true,
      },
      availabilityHours: {
        type: 'array',
        items: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'flexible'] },
        maxItems: 4,
        uniqueItems: true,
      },
      contactModes: {
        type: 'array',
        items: { type: 'string', enum: ['phone', 'whatsapp', 'person'] },
        maxItems: 3,
        uniqueItems: true,
      },
      languages: {
        type: 'array',
        items: { type: 'string', enum: ['ar', 'ar-dialect', 'fr', 'en', 'de', 'es', 'it'] },
        maxItems: 7,
        uniqueItems: true,
      },
      experience: { type: 'string', maxLength: 60 },
      sector: { type: 'string', maxLength: 120 },
      educationLevel: { type: 'string', maxLength: 120 },
      experiences: { type: 'array', items: profileExperienceSchema, maxItems: 25 },
      educations: { type: 'array', items: profileEducationSchema, maxItems: 25 },
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
