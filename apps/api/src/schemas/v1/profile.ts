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

const publicProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    job: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    image: { type: 'string', nullable: true },
    video: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    interests: { type: 'array', items: { type: 'string' } },
    languages: { type: 'array', items: { type: 'string' } },
    contact_modes: { type: 'array', items: { type: 'string' } },
    availability_days: { type: 'array', items: { type: 'string' } },
    availability_hours: { type: 'array', items: { type: 'string' } },
    offer_service: { type: 'boolean' },
    service_type: { type: 'string', nullable: true },
    price: { type: 'string', nullable: true },
    profile_type: { type: 'string', enum: ['INDIVIDUAL', 'PROVIDER'], nullable: true },
    rating: { type: 'number', nullable: true },
    reviews: { type: 'number', nullable: true },
  },
};

export const getPublicProfileSchema = {
  tags: ['profiles'],
  summary: "Get another user's viewable profile",
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
  response: {
    200: {
      description: 'Successful response',
      ...publicProfileSchema,
    },
    ...errorResponses,
  },
};

const mediaUploadResponseSchema = {
  200: {
    description: 'Successful response',
    type: 'object',
    properties: {
      image: { type: 'string', nullable: true },
      video: { type: 'string', nullable: true },
    },
  },
  ...errorResponses,
};

export const uploadProfilePhotoSchema = {
  tags: ['profiles'],
  summary: 'Upload (or replace) the current user’s profile photo',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  consumes: ['multipart/form-data'],
  response: mediaUploadResponseSchema,
};

export const deleteProfilePhotoSchema = {
  tags: ['profiles'],
  summary: "Remove the current user's profile photo",
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: mediaUploadResponseSchema,
};

export const uploadProfileVideoSchema = {
  tags: ['profiles'],
  summary: 'Upload (or replace) the current user’s intro video',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  consumes: ['multipart/form-data'],
  response: mediaUploadResponseSchema,
};

export const deleteProfileVideoSchema = {
  tags: ['profiles'],
  summary: "Remove the current user's intro video",
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: mediaUploadResponseSchema,
};

const mediaFilenameParams = {
  type: 'object',
  additionalProperties: false,
  required: ['filename'],
  properties: {
    filename: { type: 'string' },
  },
};

export const getProfilePhotoFileSchema = {
  tags: ['profiles'],
  summary: 'Serve a stored profile photo',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  params: mediaFilenameParams,
  response: { ...errorResponses },
};

export const getProfileVideoFileSchema = {
  tags: ['profiles'],
  summary: 'Stream a stored profile video (owner or an active match only)',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  params: mediaFilenameParams,
  response: { ...errorResponses },
};
