import { MultipartFile } from '@fastify/multipart';

export type ConversationIdParams = {
  id: string;
};

export type ConversationMessageParams = {
  id: string;
  messageId: string;
};

export type ConversationAudioFilenameParams = {
  filename: string;
};

export type ListMessagesQuery = {
  cursor?: string;
  limit?: number;
};

export type SendMessageBody = {
  content?: string;
  message_type?: 'text' | 'voice';
  media_url?: string;
};

export type TypingBody = {
  is_typing: boolean;
};

export type MessageQuota = {
  plan: string;
  unlimited: boolean;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  resets_at: 'midnight_utc';
};

export type ConversationPeerProfile = {
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
  created_at: Date;
};

export type ConversationInboxRow = {
  conversation_id: string;
  match_id: string | null;
  has_active_match: boolean;
  peer: ConversationPeerProfile | null;
  last_message: ConversationLastMessage | null;
  unread_count: number;
  i_blocked: boolean;
  blocked_me: boolean;
  can_send: boolean;
  updated_at: Date;
  created_at: Date;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'TEXT' | 'VOICE';
  media_url: string | null;
  is_read: boolean;
  created_at: Date;
  liked_by_me: boolean;
  like_count: number;
};

export type UploadAudioBody = {
  file: MultipartFile;
};
