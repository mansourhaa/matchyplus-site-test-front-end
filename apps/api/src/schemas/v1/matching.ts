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

const swipeActionEnum = ['left', 'right'];
const matchConfidenceEnum = ['high', 'medium', 'low'];

const scoreBreakdown = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    score: { type: 'number' },
    weight: { type: 'number' },
    contribution: { type: 'number' },
  },
};

const swipeQuota = {
  type: 'object',
  properties: {
    plan: { type: 'string' },
    unlimited: { type: 'boolean' },
    used: { type: 'number', nullable: true },
    limit: { type: 'number', nullable: true },
    remaining: { type: 'number', nullable: true },
    resets_at: { type: 'string', enum: ['midnight_utc'] },
  },
};

const matchingProfile = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    image: { type: 'string', nullable: true },
    video: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    job: { type: 'string', nullable: true },
    category: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    interests: { type: 'array', items: { type: 'string' } },
    activity_sector: { type: 'string', nullable: true },
    service_type: { type: 'string', nullable: true },
    rating: { type: 'number' },
    reviews: { type: 'number', nullable: true },
  },
};

const feedProfile = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    image: { type: 'string', nullable: true },
    video: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    job: { type: 'string', nullable: true },
    category: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    interests: { type: 'array', items: { type: 'string' } },
    goals: { type: 'array', items: { type: 'string' } },
    activity_sector: { type: 'string', nullable: true },
    service_type: { type: 'string', nullable: true },
    price: { type: 'string', nullable: true },
    availability_days: { type: 'array', items: { type: 'string' } },
    contact_modes: { type: 'array', items: { type: 'string' } },
    rating: { type: 'number' },
    reviews: { type: 'number', nullable: true },
    distance_km: { type: 'number', nullable: true },
    match_score: { type: 'number' },
    match_group: { type: 'integer', minimum: 1, maximum: 4 },
    match_type_label: { type: 'string' },
    confidence: { type: 'string', enum: matchConfidenceEnum },
    compatibility: { type: 'array', items: scoreBreakdown },
    liked_me: { type: 'boolean' },
    is_locked: { type: 'boolean' },
  },
};

const matchSummary = {
  type: 'object',
  nullable: true,
  properties: {
    match_id: { type: 'string' },
    matched_at: { type: 'string' },
    matched_user_id: { type: 'string' },
    conversation_id: { type: 'string', nullable: true },
  },
};

const matchRow = {
  type: 'object',
  properties: {
    match_id: { type: 'string' },
    matched_at: { type: 'string' },
    matched_user_id: { type: 'string' },
    conversation_id: { type: 'string', nullable: true },
    profile: { ...matchingProfile, nullable: true },
  },
};

const pendingRow = {
  type: 'object',
  properties: {
    swipe_id: { type: 'string' },
    liked_at: { type: 'string' },
    profile: matchingProfile,
  },
};

const targetUserParams = {
  type: 'object',
  additionalProperties: false,
  required: ['userId'],
  properties: {
    userId: { type: 'string', minLength: 1 },
  },
};

const postSwipeBody = {
  type: 'object',
  additionalProperties: false,
  required: ['target_user_id', 'direction'],
  properties: {
    target_user_id: { type: 'string', minLength: 1 },
    direction: { type: 'string', enum: swipeActionEnum },
  },
};

const swipeResult = {
  type: 'object',
  properties: {
    swipe_id: { type: 'string' },
    direction: { type: 'string', enum: ['LEFT', 'RIGHT'] },
    match: matchSummary,
    quota: swipeQuota,
  },
};

/** GET /discovery/swipe-feed */
export const swipeFeedQuerySchema = {
  tags: ['discovery'],
  summary: 'Ranked swipe feed',
  description:
    'Returns eligible profiles ranked by scripted Discovery v5 scoring, with optional search filters and offset pagination. Requires JWT.',
  security: [{ http: [] }],
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      limit: { type: 'integer', minimum: 1, maximum: 50 },
      offset: { type: 'integer', minimum: 0 },
      context: { type: 'string', enum: ['swipe', 'search'] },
      q: { type: 'string', maxLength: 120 },
      maxDistanceKm: { type: 'number', minimum: 1, maximum: 1000 },
      serviceTypes: { type: 'string', maxLength: 500 },
      sector: { type: 'string', maxLength: 100 },
      sectors: { type: 'string', maxLength: 500 },
      interests: { type: 'string', maxLength: 500 },
      minPrice: { type: 'number', minimum: 0 },
      maxPrice: { type: 'number', minimum: 0 },
      availableOnly: { type: 'boolean' },
      profileType: { type: 'string', enum: ['INDIVIDUAL', 'PROVIDER'] },
      minRating: { type: 'number', minimum: 0, maximum: 5 },
      sort: {
        type: 'string',
        enum: ['match', 'distance', 'rating', 'price_asc', 'price_desc'],
      },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        profiles: { type: 'array', items: feedProfile },
        count: { type: 'integer' },
        offset: { type: 'integer' },
        limit: { type: 'integer' },
        has_more: { type: 'boolean' },
        feed_breakdown: {
          type: 'object',
          properties: {
            g1_complementary: { type: 'integer' },
            g2_domain: { type: 'integer' },
            g3_network: { type: 'integer' },
            g4_suggestions: { type: 'integer' },
            feed_total: { type: 'integer' },
          },
        },
        quota: swipeQuota,
        scoring_version: { type: 'string', enum: ['v5-scripted'] },
      },
    },
    ...errorResponses,
  },
};

/** GET /discovery/sectors */
export const discoverySectorsSchema = {
  tags: ['discovery'],
  summary: 'List distinct sectors from database profiles',
  description:
    'Returns unique active sectors, categories, and service types from profiles in the database.',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        sectors: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    ...errorResponses,
  },
};

/** GET /discovery/quota */
export const discoveryQuotaSchema = {
  tags: ['discovery'],
  summary: 'Daily right-swipe quota snapshot',
  description: 'UTC-day RIGHT swipe usage from SwipeLog. Requires JWT.',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      ...swipeQuota,
    },
    ...errorResponses,
  },
};

/** POST /discovery/swipe and POST /swipe */
export const postSwipeSchema = {
  tags: ['discovery', 'swipe'],
  summary: 'Like or pass a profile',
  description:
    'Upserts live swipe state, appends SwipeLog, enforces daily RIGHT quota, and creates a match on reciprocal RIGHT. Requires JWT.',
  security: [{ http: [] }],
  body: postSwipeBody,
  response: {
    200: {
      description: 'Successful response',
      ...swipeResult,
    },
    ...errorResponses,
  },
};

/** GET /swipe/matches */
export const listMatchesSchema = {
  tags: ['swipe'],
  summary: 'List mutual matches',
  description: 'Active matches for the authenticated user. Requires JWT.',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        matches: { type: 'array', items: matchRow },
        count: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

/** GET /swipe/pending */
export const listPendingSchema = {
  tags: ['swipe'],
  summary: 'List outgoing pending likes',
  description: 'One-way RIGHT swipes that are not yet mutual matches. Requires JWT.',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        pending: { type: 'array', items: pendingRow },
        count: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

/** DELETE /swipe/pending/:userId */
export const withdrawPendingSchema = {
  tags: ['swipe'],
  summary: 'Withdraw a pending like',
  description:
    'Removes the outgoing RIGHT swipe and logs WITHDRAWN (not LEFT) so the profile can reappear in the feed. Requires JWT.',
  security: [{ http: [] }],
  params: targetUserParams,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        withdrawn_user_id: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

/** GET /swipe/stats */
export const swipeStatsSchema = {
  tags: ['swipe'],
  summary: 'Swipe / match aggregates',
  description:
    'Likes, passes, pending, matches, and quota for the authenticated user. Requires JWT.',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        likes: { type: 'integer' },
        passes: { type: 'integer' },
        pending: { type: 'integer' },
        matches: { type: 'integer' },
        quota: swipeQuota,
      },
    },
    ...errorResponses,
  },
};

/** GET /swipe/who-liked-me */
export const whoLikedMeSchema = {
  tags: ['swipe'],
  summary: 'Incoming likes (premium+)',
  description:
    'Lists users who RIGHT-swiped the authenticated user and are not yet matched. Requires JWT and PREMIUM / PREMIUM_PLUS (or unlimited plan).',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        who_liked_me: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              liked_at: { type: 'string' },
              profile: matchingProfile,
            },
          },
        },
        count: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

/** POST /swipe/unmatch/:userId */
export const unmatchSchema = {
  tags: ['swipe'],
  summary: 'Unmatch a user',
  description:
    'Deletes the Match row and clears both sides’ swipe + swipe-log history for the pair. Detaches the conversation (keeps message history, nulls match_id). Requires JWT.',
  security: [{ http: [] }],
  params: targetUserParams,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        removed_user_id: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

/** GET /swipe/history */
export const listSwipeHistorySchema = {
  tags: ['swipe'],
  summary: 'List swipe and interaction history',
  description:
    'List historical swipes (likes, passes, matches) with target profiles and overall summary statistics. Requires JWT.',
  security: [{ http: [] }],
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      direction: { type: 'string', enum: ['all', 'right', 'left', 'match'] },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      q: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              direction: { type: 'string' },
              swiped_at: { type: 'string' },
              is_matched: { type: 'boolean' },
              conversation_id: { type: 'string', nullable: true },
              target: matchingProfile,
            },
          },
        },
        total: { type: 'integer' },
        has_more: { type: 'boolean' },
        stats: {
          type: 'object',
          properties: {
            total_swipes: { type: 'integer' },
            likes: { type: 'integer' },
            passes: { type: 'integer' },
            matches: { type: 'integer' },
            match_rate: { type: 'number' },
          },
        },
      },
    },
    ...errorResponses,
  },
};

/** GET /realtime (WebSocket upgrade) */
export const realtimeSchema = {
  tags: ['realtime'],
  summary: 'Match realtime WebSocket',
  description:
    'Authenticated WebSocket for match and messaging events (`notification_match`, `match_removed`, `new_message`, `messages_read`, typing, likes). Auth via cookie/Bearer on upgrade, optional legacy `?access_token=`, or Capacitor first-frame `{ event: "auth", payload: { access_token } }` (server replies `auth_ok`). Server pushes JSON `{ event, payload }`. Clients may send `{ event: "typing"|"stop_typing", payload: { conversation_id } }` or `{ event: "ping" }` (server replies `pong`). Multi-instance fan-out uses Redis Streams when `REDIS_URL` is set.',
  security: [{ http: [] }],
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      access_token: {
        type: 'string',
        description:
          'Legacy JWT on the upgrade URL (prefer cookie or Cap first-frame auth — query tokens often appear in access logs)',
      },
    },
  },
  response: {
    101: {
      description: 'Switching Protocols — WebSocket connected',
      type: 'null',
    },
    ...errorResponses,
  },
};
