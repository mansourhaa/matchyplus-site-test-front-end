export type MessageQuota = {
  plan: string;
  unlimited: boolean;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  resets_at: 'midnight_utc';
};

export type ConversationPeer = {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  job: string | null;
  category: string | null;
  city: string | null;
};

export type ConversationLastMessage = {
  id: string;
  content: string;
  message_type: 'TEXT' | 'VOICE';
  sender_id: string;
  is_read: boolean;
  created_at: string;
};

export type ConversationInboxRow = {
  conversation_id: string;
  match_id: string | null;
  has_active_match: boolean;
  peer: ConversationPeer | null;
  last_message: ConversationLastMessage | null;
  unread_count: number;
  i_blocked: boolean;
  blocked_me: boolean;
  can_send: boolean;
  updated_at: string;
  created_at: string;
};

export type ConversationDetail = {
  conversation_id: string;
  match_id: string | null;
  has_active_match: boolean;
  peer: ConversationPeer | null;
  i_blocked: boolean;
  blocked_me: boolean;
  can_send: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'TEXT' | 'VOICE';
  media_url: string | null;
  is_read: boolean;
  created_at: string;
  liked_by_me: boolean;
  like_count: number;
};

export type MessagesPage = {
  messages: ChatMessage[];
  next_cursor: string | null;
  has_more: boolean;
};

export type SendMessageInput = {
  conversationId: string;
  content?: string;
  message_type?: 'text' | 'voice';
  media_url?: string;
};

export type MessagingRealtimePayload = {
  event?: string;
  payload?: {
    event_type?: string;
    matched_user_id?: string;
    conversation_id?: string;
    id?: string;
    sender_id?: string;
    content?: string;
    message_type?: 'TEXT' | 'VOICE';
    media_url?: string | null;
    is_read?: boolean;
    created_at?: string;
    liked_by_me?: boolean;
    like_count?: number;
    reader_id?: string;
    message_id?: string;
    user_id?: string;
    liked?: boolean;
    has_active_match?: boolean;
    can_send?: boolean;
    i_blocked?: boolean;
    blocked_me?: boolean;
    preview?: string;
  };
};

export type MessagingState = {
  inbox: ConversationInboxRow[];
  inboxLoading: boolean;
  inboxError: string | null;
  activeConversationId: string | null;
  conversation: ConversationDetail | null;
  conversationLoading: boolean;
  conversationError: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesLoadingMore: boolean;
  messagesError: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  sendLoading: boolean;
  sendError: string | null;
  quota: MessageQuota | null;
  peerTyping: boolean;
};
