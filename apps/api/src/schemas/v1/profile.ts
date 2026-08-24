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
    experience: { type: 'string', nullable: true },
    activity_sector: { type: 'string', nullable: true },
    looking_for: { type: 'string', nullable: true },
    selected_goals: { type: 'array', items: { type: 'string' } },
    rating: { type: 'number', nullable: true },
    reviews: { type: 'number', nullable: true },
    matched: { type: 'boolean' },
    viewer_has_rated: { type: 'boolean' },
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

export const syncUserLocationSchema = {
  tags: ['profiles'],
  summary: "Save the current user's coordinates and derive their city from them",
  description:
    'Called once the app has real coordinates (device GPS or the IP fallback) so the ' +
    "profile's city reflects where the member actually is, instead of only the optional " +
    'free-text city entered once at signup.',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['latitude', 'longitude'],
    properties: {
      latitude: { type: 'number', minimum: -90, maximum: 90 },
      longitude: { type: 'number', minimum: -180, maximum: 180 },
    },
  },
  response: {
    200: {
      description: 'Successful response — city is null when reverse geocoding failed',
      type: 'object',
      properties: {
        city: { type: 'string', nullable: true },
      },
    },
    ...errorResponses,
  },
};

export const notifyProfileViewSchema = {
  tags: ['profiles'],
  summary: 'Let a profile owner know their profile was viewed',
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
      description: 'Successful response — `notified` is false when viewing your own profile',
      type: 'object',
      properties: {
        notified: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
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
  response: {
    200: {
      description: 'The photo file, streamed as binary image data',
      type: 'string',
      contentMediaType: 'image/*',
    },
    ...errorResponses,
  },
};

export const rateProfileSchema = {
  tags: ['profiles'],
  summary: "Rate a matched user's profile — one rating per pair, cannot be changed once set",
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
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['rating'],
    properties: {
      rating: { type: 'integer', minimum: 1, maximum: 5 },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        rating: { type: 'number' },
        reviews: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

export const getProfileVideoFileSchema = {
  tags: ['profiles'],
  summary: 'Stream a stored profile video (owner or an active match only)',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  params: mediaFilenameParams,
  response: {
    200: {
      description: 'The full video file, streamed as binary video data',
      type: 'string',
      contentMediaType: 'video/*',
    },
    206: {
      description: 'A single byte-range slice of the video, per the request Range header',
      type: 'string',
      contentMediaType: 'video/*',
    },
    ...errorResponses,
  },
};

export const blockUserSchema = {
  tags: ['profiles'],
  summary: 'Block a user',
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
      description: 'User blocked',
      type: 'object',
      properties: {
        blocked: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
};

export const unblockUserSchema = {
  tags: ['profiles'],
  summary: 'Unblock a user',
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
      description: 'User unblocked',
      type: 'object',
      properties: {
        blocked: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
};

export const listBlockedUsersSchema = {
  tags: ['profiles'],
  summary: 'List users blocked by the authenticated user',
  security: [{ http: [] }],
  headers: authenticatedHeadersSchema,
  response: {
    200: {
      description: 'List of blocked users',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          image: { type: 'string', nullable: true },
          job: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          activity_sector: { type: 'string', nullable: true },
          service_type: { type: 'string', nullable: true },
          blocked_at: { type: 'string' },
        },
        required: ['id', 'name', 'blocked_at'],
      },
    },
    ...errorResponses,
  },
};
