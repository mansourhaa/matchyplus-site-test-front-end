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

const workExperienceSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    company: { type: 'string' },
    type: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    current: { type: 'boolean' },
  },
  required: ['title', 'company'],
};

const educationSchema = {
  type: 'object',
  properties: {
    school: { type: 'string' },
    degree: { type: 'string' },
    field: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    result: { type: 'string' },
  },
  required: ['school'],
};

const onboardingProfileResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    job: { type: 'string' },
    bio: { type: 'string' },
    image: { type: 'string' },
    city: { type: 'string' },
    profile_type: { type: 'string', enum: ['INDIVIDUAL', 'PROVIDER'] },
    offer_service: { type: 'boolean' },
    service_type: { type: 'string' },
    sector: { type: 'string' },
    price: { type: 'string' },
    interests: { type: 'array', items: { type: 'string' } },
    selected_goals: { type: 'array', items: { type: 'string' } },
    experience: { type: 'string' },
    experiences: { type: 'array', items: workExperienceSchema },
    education_level: { type: 'string' },
    educations: { type: 'array', items: educationSchema },
    availability_days: { type: 'array', items: { type: 'string' } },
    availability_hours: { type: 'array', items: { type: 'string' } },
    contact_modes: { type: 'array', items: { type: 'string' } },
    languages: { type: 'array', items: { type: 'string' } },
    onboardingCompleted: { type: 'boolean' },
  },
};

export const getOnboardingProfileSchema = {
  tags: ['onboarding'],
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
  headers: authenticatedHeadersSchema,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      job: { type: 'string' },
      bio: { type: 'string', maxLength: 250 },
      image: { type: 'string' },
      city: { type: 'string' },
      profileType: { type: 'string', enum: ['INDIVIDUAL', 'PROVIDER'] },
      offerService: { type: 'boolean' },
      serviceType: { type: 'string' },
      sector: { type: 'string' },
      price: { type: 'string' },
      interests: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      selectedGoals: { type: 'array', items: { type: 'string' } },
      experience: { type: 'string' },
      experiences: { type: 'array', items: workExperienceSchema },
      educationLevel: { type: 'string' },
      educations: { type: 'array', items: educationSchema },
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
  headers: authenticatedHeadersSchema,
  response: {
    200: {
      description: 'Successful response',
      ...onboardingProfileResponseSchema,
    },
    ...errorResponses,
  },
};
