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

const userStatusEnum = ['ACTIVE', 'INACTIVE', 'BANNED'];
const userPlanEnum = ['FREE', 'PREMIUM', 'PREMIUM_PLUS'];

const adminUser = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string' },
    status: { type: 'string' },
    plan: { type: 'string' },
    phone: { type: 'string', nullable: true },
    job: { type: 'string', nullable: true },
    category: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    image: { type: 'string', nullable: true },
    interests: { type: 'array', items: { type: 'string' } },
    languages: { type: 'array', items: { type: 'string' } },
    contact_modes: { type: 'array', items: { type: 'string' } },
    experience: { type: 'string', nullable: true },
    schedule: { type: 'string', nullable: true },
    price: { type: 'string', nullable: true },
    rating: { type: 'number' },
    reviews: { type: 'number' },
    matches: { type: 'number' },
    missions: { type: 'number' },
    total_earnings: { type: 'number' },
    last_login: { type: 'string', nullable: true },
    create_at: { type: 'string' },
  },
};

export const adminListUsersSchema = {
  tags: ['admin'],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      search: { type: 'string' },
      status: { type: 'string', enum: userStatusEnum },
      plan: { type: 'string', enum: userPlanEnum },
      category: { type: 'string' },
    },
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        users: { type: 'array', items: adminUser },
        total: { type: 'number' },
      },
    },
    ...errorResponses,
  },
};

export const adminGetUserSchema = {
  tags: ['admin'],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { user: adminUser },
    },
    ...errorResponses,
  },
};

export const adminUpdateUserSchema = {
  tags: ['admin'],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      job: { type: 'string' },
      category: { type: 'string' },
      city: { type: 'string' },
      bio: { type: 'string' },
      experience: { type: 'string' },
      schedule: { type: 'string' },
      price: { type: 'string' },
      status: { type: 'string', enum: userStatusEnum },
      plan: { type: 'string', enum: userPlanEnum },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { user: adminUser },
    },
    ...errorResponses,
  },
};

export const adminUpdateUserStatusSchema = {
  tags: ['admin'],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: userStatusEnum },
    },
    required: ['status'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { user: adminUser },
    },
    ...errorResponses,
  },
};

export const adminDeleteUserSchema = {
  tags: ['admin'],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { deleted: { type: 'boolean' } },
    },
    ...errorResponses,
  },
};

export const adminStatsSchema = {
  tags: ['admin'],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number' },
            activeUsers: { type: 'number' },
            inactiveUsers: { type: 'number' },
            bannedUsers: { type: 'number' },
            freeUsers: { type: 'number' },
            premiumUsers: { type: 'number' },
            premiumPlusUsers: { type: 'number' },
          },
        },
      },
    },
    ...errorResponses,
  },
};

const adminPlan = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    price: { type: 'number' },
    color: { type: 'string' },
    is_active: { type: 'boolean' },
    badge: { type: 'string' },
    trial_days: { type: 'number' },
    description: { type: 'string' },
    features: { type: 'array', items: { type: 'string' } },
    swipes_per_day: { type: 'number' },
    profiles_per_category: { type: 'number' },
    messages_per_day: { type: 'number' },
    actions_per_day: { type: 'number' },
    boosts_per_month: { type: 'number' },
    super_connects_per_month: { type: 'number' },
    sort_order: { type: 'number' },
  },
};

export const adminListPlansSchema = {
  tags: ['admin'],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { plans: { type: 'array', items: adminPlan } },
    },
    ...errorResponses,
  },
};

export const adminUpdatePlanSchema = {
  tags: ['admin'],
  params: {
    type: 'object',
    properties: { id: { type: 'string', enum: userPlanEnum } },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      color: { type: 'string' },
      is_active: { type: 'boolean' },
      badge: { type: 'string' },
      trial_days: { type: 'number', minimum: 0 },
      description: { type: 'string' },
      features: { type: 'array', items: { type: 'string' } },
      swipes_per_day: { type: 'number', minimum: -1 },
      profiles_per_category: { type: 'number', minimum: -1 },
      messages_per_day: { type: 'number', minimum: -1 },
      actions_per_day: { type: 'number', minimum: -1 },
      boosts_per_month: { type: 'number', minimum: 0 },
      super_connects_per_month: { type: 'number', minimum: 0 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { plan: adminPlan },
    },
    ...errorResponses,
  },
};

export const adminAnalyticsSchema = {
  tags: ['admin'],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        analytics: {
          type: 'object',
          properties: {
            signupsTimeline: {
              type: 'array',
              items: {
                type: 'object',
                properties: { month: { type: 'string' }, users: { type: 'number' } },
              },
            },
            platformTimeline: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  users: { type: 'number' },
                  revenue: { type: 'number' },
                },
              },
            },
            trends: {
              type: 'object',
              nullable: true,
              properties: {
                users: { type: 'number' },
                revenue: { type: 'number' },
                matches: { type: 'number' },
                conversion: { type: 'number' },
              },
            },
            categoryDistribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, value: { type: 'number' } },
              },
            },
            matchesByCategory: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, value: { type: 'number' } },
              },
            },
            topCities: {
              type: 'array',
              items: {
                type: 'object',
                properties: { city: { type: 'string' }, users: { type: 'number' } },
              },
            },
            revenueByPlan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  plan: { type: 'string' },
                  users: { type: 'number' },
                  monthlyRevenue: { type: 'number' },
                },
              },
            },
            totalMatches: { type: 'number' },
            estimatedMonthlyRevenue: { type: 'number' },
          },
        },
      },
    },
    ...errorResponses,
  },
};

export const adminChangePasswordSchema = {
  tags: ['admin'],
  body: {
    type: 'object',
    properties: {
      currentPassword: { type: 'string' },
      newPassword: { type: 'string', minLength: 8 },
    },
    required: ['currentPassword', 'newPassword'],
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: { updated: { type: 'boolean' } },
    },
    ...errorResponses,
  },
};
