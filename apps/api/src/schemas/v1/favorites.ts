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

const favoriteProfile = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    job: { type: 'string', nullable: true },
    category: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    image: { type: 'string', nullable: true },
    video: { type: 'string', nullable: true },
    rating: { type: 'number' },
    reviews: { type: 'number' },
    profile_type: { type: 'string', nullable: true },
    offer_service: { type: 'boolean' },
    service_type: { type: 'string', nullable: true },
    price: { type: 'string', nullable: true },
    experience: { type: 'string', nullable: true },
    schedule: { type: 'string', nullable: true },
    languages: { type: 'array', items: { type: 'string' } },
    interests: { type: 'array', items: { type: 'string' } },
    contact_modes: { type: 'array', items: { type: 'string' } },
    match_score: { type: 'number' },
    match_type_label: { type: 'string' },
    distance_km: { type: 'number', nullable: true },
    favorited_at: { type: 'string' },
  },
  required: [
    'id',
    'name',
    'rating',
    'reviews',
    'offer_service',
    'languages',
    'interests',
    'contact_modes',
    'match_score',
    'favorited_at',
  ],
};

export const getFavoritesSchema = {
  tags: ['Favorites'],
  summary: 'List all favorited profiles for the current user',
  security: [{ http: [] }],
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      limit: { type: 'number', default: 50 },
      offset: { type: 'number', default: 0 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        favorites: {
          type: 'array',
          items: favoriteProfile,
        },
        total: { type: 'number' },
      },
      required: ['favorites', 'total'],
    },
    ...errorResponses,
  },
};

export const getFavoriteIdsSchema = {
  tags: ['Favorites'],
  summary: 'Get all favorited target user IDs for fast UI lookup',
  security: [{ http: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        favoriteIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['favoriteIds'],
    },
    ...errorResponses,
  },
};

export const toggleFavoriteSchema = {
  tags: ['Favorites'],
  summary: 'Toggle favorite status for a target user profile',
  security: [{ http: [] }],
  params: {
    type: 'object',
    required: ['targetUserId'],
    additionalProperties: false,
    properties: {
      targetUserId: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        favorited: { type: 'boolean' },
        targetUserId: { type: 'string' },
      },
      required: ['favorited', 'targetUserId'],
    },
    ...errorResponses,
  },
};

export const removeFavoriteSchema = {
  tags: ['Favorites'],
  summary: 'Remove a user profile from favorites',
  security: [{ http: [] }],
  params: {
    type: 'object',
    required: ['targetUserId'],
    additionalProperties: false,
    properties: {
      targetUserId: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        favorited: { type: 'boolean', enum: [false] },
        targetUserId: { type: 'string' },
      },
      required: ['favorited', 'targetUserId'],
    },
    ...errorResponses,
  },
};
