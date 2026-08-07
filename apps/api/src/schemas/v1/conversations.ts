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

const messageQuota = {
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

const peerProfile = {
  type: 'object',
  nullable: true,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    image: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    job: { type: 'string', nullable: true },
    category: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
  },
};

const lastMessage = {
  type: 'object',
  nullable: true,
  properties: {
    id: { type: 'string' },
    content: { type: 'string' },
    message_type: { type: 'string', enum: ['TEXT', 'VOICE'] },
    sender_id: { type: 'string' },
    is_read: { type: 'boolean' },
    created_at: { type: 'string' },
  },
};

const inboxRow = {
  type: 'object',
  properties: {
    conversation_id: { type: 'string' },
    match_id: { type: 'string', nullable: true },
    has_active_match: { type: 'boolean' },
    peer: peerProfile,
    last_message: lastMessage,
    unread_count: { type: 'integer' },
    i_blocked: { type: 'boolean' },
    blocked_me: { type: 'boolean' },
    can_send: { type: 'boolean' },
    updated_at: { type: 'string' },
    created_at: { type: 'string' },
  },
};

const messageRow = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    conversation_id: { type: 'string' },
    sender_id: { type: 'string' },
    content: { type: 'string' },
    message_type: { type: 'string', enum: ['TEXT', 'VOICE'] },
    media_url: { type: 'string', nullable: true },
    is_read: { type: 'boolean' },
    created_at: { type: 'string' },
    liked_by_me: { type: 'boolean' },
    like_count: { type: 'integer' },
  },
};

const conversationIdParams = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const conversationMessageParams = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'messageId'],
  properties: {
    id: { type: 'string', minLength: 1 },
    messageId: { type: 'string', minLength: 1 },
  },
};

const audioFilenameParams = {
  type: 'object',
  additionalProperties: false,
  required: ['filename'],
  properties: {
    filename: { type: 'string', minLength: 1 },
  },
};

const listMessagesQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cursor: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  },
};

const sendMessageBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    content: { type: 'string' },
    message_type: { type: 'string', enum: ['text', 'voice'] },
    media_url: { type: 'string' },
  },
};

const typingBody = {
  type: 'object',
  additionalProperties: false,
  required: ['is_typing'],
  properties: {
    is_typing: { type: 'boolean' },
  },
};

/** GET /conversations */
export const listConversationsSchema = {
  tags: ['conversations'],
  summary: 'List inbox conversations',
  description:
    'Returns conversations for the authenticated user with peer, last message, unread, and send eligibility. Requires JWT.',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        conversations: { type: 'array', items: inboxRow },
        count: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

/** GET /conversations/quota */
export const messageQuotaSchema = {
  tags: ['conversations'],
  summary: 'Daily message quota',
  description: 'Plan-based messages_per_day snapshot for the authenticated user. Requires JWT.',
  security: [{ http: [] }],
  response: {
    200: {
      description: 'Successful response',
      ...messageQuota,
    },
    ...errorResponses,
  },
};

/** GET /conversations/:id */
export const getConversationSchema = {
  tags: ['conversations'],
  summary: 'Get conversation metadata',
  description: 'Participant-only conversation header with peer and can_send. Requires JWT.',
  security: [{ http: [] }],
  params: conversationIdParams,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        conversation_id: { type: 'string' },
        match_id: { type: 'string', nullable: true },
        has_active_match: { type: 'boolean' },
        peer: peerProfile,
        i_blocked: { type: 'boolean' },
        blocked_me: { type: 'boolean' },
        can_send: { type: 'boolean' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

/** GET /conversations/:id/messages */
export const listMessagesSchema = {
  tags: ['conversations'],
  summary: 'Paginated message history',
  description:
    'Cursor-paginated messages (newest page first in query, returned oldest→newest). Auto-marks unread as read. Requires JWT.',
  security: [{ http: [] }],
  params: conversationIdParams,
  querystring: listMessagesQuery,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        messages: { type: 'array', items: messageRow },
        next_cursor: { type: 'string', nullable: true },
        has_more: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
};

/** POST /conversations/:id/messages */
export const sendMessageSchema = {
  tags: ['conversations'],
  summary: 'Send a message',
  description:
    'Send text or voice (media_url from upload-audio). Requires active match, no block, and quota. Requires JWT.',
  security: [{ http: [] }],
  params: conversationIdParams,
  body: sendMessageBody,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        message: messageRow,
        quota: messageQuota,
      },
    },
    ...errorResponses,
  },
};

/** POST /conversations/:id/read */
export const markReadSchema = {
  tags: ['conversations'],
  summary: 'Mark messages as read',
  description: 'Marks peer messages as read and notifies the peer. Requires JWT.',
  security: [{ http: [] }],
  params: conversationIdParams,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        marked: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

/** POST /conversations/:id/typing */
export const typingSchema = {
  tags: ['conversations'],
  summary: 'Typing indicator',
  description: 'Fans out ephemeral typing events to the peer via realtime. Requires JWT.',
  security: [{ http: [] }],
  params: conversationIdParams,
  body: typingBody,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
      },
    },
    ...errorResponses,
  },
};

/** POST /conversations/:id/messages/:messageId/like */
export const toggleLikeSchema = {
  tags: ['conversations'],
  summary: 'Toggle message like',
  description: 'Persists or removes a MessageLike for the caller. Requires JWT.',
  security: [{ http: [] }],
  params: conversationMessageParams,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        conversation_id: { type: 'string' },
        message_id: { type: 'string' },
        user_id: { type: 'string' },
        liked: { type: 'boolean' },
        like_count: { type: 'integer' },
      },
    },
    ...errorResponses,
  },
};

/** POST /conversations/upload-audio */
export const uploadAudioSchema = {
  tags: ['conversations'],
  summary: 'Upload a voice note',
  description: 'Multipart audio upload; returns `/uploads/audio/<file>` for send. Requires JWT.',
  security: [{ http: [] }],
  consumes: ['multipart/form-data'],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
    },
    ...errorResponses,
  },
};

/** GET /conversations/audio/:filename */
export const getAudioFileSchema = {
  tags: ['conversations'],
  summary: 'Stream voice audio',
  description:
    'Participant-only stream of a voice file referenced by a message media_url. Requires JWT.',
  security: [{ http: [] }],
  params: audioFilenameParams,
  response: {
    200: {
      description: 'Audio stream',
      type: 'string',
      format: 'binary',
    },
    ...errorResponses,
  },
};
