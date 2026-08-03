import { api, apiErrorKey } from '@/lib/api';
import type { RootState } from '@/lib/store';
import { type PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type {
  ChatMessage,
  ConversationDetail,
  ConversationInboxRow,
  MessageQuota,
  MessagesPage,
  MessagingState,
  SendMessageInput,
} from '../types';

const initialState: MessagingState = {
  inbox: [],
  inboxLoading: false,
  inboxError: null,
  activeConversationId: null,
  conversation: null,
  conversationLoading: false,
  conversationError: null,
  messages: [],
  messagesLoading: false,
  messagesLoadingMore: false,
  messagesError: null,
  nextCursor: null,
  hasMore: false,
  sendLoading: false,
  sendError: null,
  quota: null,
  peerTyping: false,
};

export const fetchInbox = createAsyncThunk(
  'messaging/fetchInbox',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ conversations: ConversationInboxRow[] }>('/conversations');
      return response.data.conversations ?? [];
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'chat.errors.inbox'));
    }
  },
);

export const fetchConversation = createAsyncThunk(
  'messaging/fetchConversation',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ConversationDetail>(`/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'chat.errors.load'));
    }
  },
);

export const fetchMessages = createAsyncThunk(
  'messaging/fetchMessages',
  async (input: { conversationId: string; cursor?: string | null }, { rejectWithValue }) => {
    try {
      const response = await api.get<MessagesPage>(
        `/conversations/${input.conversationId}/messages`,
        { params: { cursor: input.cursor || undefined, limit: 50 } },
      );
      return {
        ...response.data,
        conversationId: input.conversationId,
        append: Boolean(input.cursor),
      };
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'chat.errors.load'));
    }
  },
);

export const sendMessage = createAsyncThunk(
  'messaging/sendMessage',
  async (input: SendMessageInput, { rejectWithValue }) => {
    try {
      const response = await api.post<{ message: ChatMessage; quota: MessageQuota }>(
        `/conversations/${input.conversationId}/messages`,
        {
          content: input.content,
          message_type: input.message_type ?? 'text',
          media_url: input.media_url,
        },
      );
      return response.data;
    } catch (error) {
      const code = apiErrorKey(error, 'chat.errors.send');
      if (
        (error as { response?: { data?: { code?: string } } })?.response?.data?.code ===
        'message_quota_exceeded'
      ) {
        return rejectWithValue('chat.errors.quotaExceeded');
      }
      return rejectWithValue(code);
    }
  },
);

export const uploadVoiceNote = createAsyncThunk(
  'messaging/uploadVoiceNote',
  async (input: { conversationId: string; blob: Blob }, { rejectWithValue, dispatch }) => {
    try {
      const form = new FormData();
      form.append('file', input.blob, `voice-${Date.now()}.webm`);
      const upload = await api.post<{ url: string }>('/conversations/upload-audio', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return await dispatch(
        sendMessage({
          conversationId: input.conversationId,
          message_type: 'voice',
          media_url: upload.data.url,
          content: '',
        }),
      ).unwrap();
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'chat.errors.send'));
    }
  },
);

export const toggleMessageLike = createAsyncThunk(
  'messaging/toggleMessageLike',
  async (input: { conversationId: string; messageId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post<{
        message_id: string;
        liked: boolean;
        like_count: number;
      }>(`/conversations/${input.conversationId}/messages/${input.messageId}/like`);
      return response.data;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'chat.errors.like'));
    }
  },
);

export const markConversationRead = createAsyncThunk(
  'messaging/markConversationRead',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await api.post(`/conversations/${conversationId}/read`);
      return { conversationId };
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'chat.errors.load'));
    }
  },
);

export const sendTyping = createAsyncThunk(
  'messaging/sendTyping',
  async (input: { conversationId: string; isTyping: boolean }, { rejectWithValue }) => {
    try {
      await api.post(`/conversations/${input.conversationId}/typing`, {
        is_typing: input.isTyping,
      });
      return input;
    } catch (error) {
      return rejectWithValue(apiErrorKey(error, 'chat.errors.send'));
    }
  },
);

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    resetMessagingState() {
      return initialState;
    },
    setActiveConversation(state, action: PayloadAction<string | null>) {
      if (state.activeConversationId !== action.payload) {
        state.conversation = null;
        state.messages = [];
        state.nextCursor = null;
        state.hasMore = false;
        state.messagesError = null;
        state.conversationError = null;
        // Drop in-flight send/history loading from the previous thread so the
        // new composer is not stuck disabled / spinner-locked.
        state.messagesLoading = false;
        state.messagesLoadingMore = false;
        state.sendLoading = false;
        state.sendError = null;
      }
      state.activeConversationId = action.payload;
      state.peerTyping = false;
    },
    clearSendError(state) {
      state.sendError = null;
    },
    applyRealtimeMessage(state, action: PayloadAction<ChatMessage & { viewer_id?: string }>) {
      const message = action.payload;
      if (state.activeConversationId === message.conversation_id) {
        if (!state.messages.some((m) => m.id === message.id)) {
          state.messages.push(message);
        }
        state.peerTyping = false;
      }
      const inboxRow = state.inbox.find((row) => row.conversation_id === message.conversation_id);
      if (inboxRow) {
        inboxRow.last_message = {
          id: message.id,
          content: message.content,
          message_type: message.message_type,
          sender_id: message.sender_id,
          is_read: message.is_read,
          created_at: message.created_at,
        };
        inboxRow.updated_at = message.created_at;
        const viewerId = action.payload.viewer_id;
        const isOwnMessage = Boolean(viewerId && message.sender_id === viewerId);
        if (state.activeConversationId !== message.conversation_id && !isOwnMessage) {
          inboxRow.unread_count += 1;
        }
      }
    },
    applyMessagesRead(
      state,
      action: PayloadAction<{ conversation_id: string; reader_id: string }>,
    ) {
      if (state.activeConversationId !== action.payload.conversation_id) return;
      for (const message of state.messages) {
        if (message.sender_id !== action.payload.reader_id) {
          message.is_read = true;
        }
      }
    },
    applyLikeChanged(
      state,
      action: PayloadAction<{
        message_id: string;
        liked: boolean;
        like_count: number;
        user_id: string;
        viewer_id?: string;
      }>,
    ) {
      const message = state.messages.find((m) => m.id === action.payload.message_id);
      if (!message) return;
      message.like_count = action.payload.like_count;
      if (action.payload.viewer_id && action.payload.user_id === action.payload.viewer_id) {
        message.liked_by_me = action.payload.liked;
      }
    },
    setLikedByMe(
      state,
      action: PayloadAction<{ message_id: string; liked_by_me: boolean; like_count: number }>,
    ) {
      const message = state.messages.find((m) => m.id === action.payload.message_id);
      if (!message) return;
      message.liked_by_me = action.payload.liked_by_me;
      message.like_count = action.payload.like_count;
    },
    setPeerTyping(state, action: PayloadAction<{ conversation_id: string; typing: boolean }>) {
      if (state.activeConversationId === action.payload.conversation_id) {
        state.peerTyping = action.payload.typing;
      }
    },
    applyConversationStatus(
      state,
      action: PayloadAction<{
        conversation_id: string;
        has_active_match?: boolean;
        can_send?: boolean;
        i_blocked?: boolean;
        blocked_me?: boolean;
      }>,
    ) {
      const { conversation_id, ...rest } = action.payload;
      if (state.conversation?.conversation_id === conversation_id) {
        if (rest.has_active_match !== undefined) {
          state.conversation.has_active_match = rest.has_active_match;
        }
        if (rest.can_send !== undefined) state.conversation.can_send = rest.can_send;
        if (rest.i_blocked !== undefined) state.conversation.i_blocked = rest.i_blocked;
        if (rest.blocked_me !== undefined) state.conversation.blocked_me = rest.blocked_me;
      }
      const inboxRow = state.inbox.find((row) => row.conversation_id === conversation_id);
      if (inboxRow) {
        if (rest.has_active_match !== undefined) inboxRow.has_active_match = rest.has_active_match;
        if (rest.can_send !== undefined) inboxRow.can_send = rest.can_send;
        if (rest.i_blocked !== undefined) inboxRow.i_blocked = rest.i_blocked;
        if (rest.blocked_me !== undefined) inboxRow.blocked_me = rest.blocked_me;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInbox.pending, (state) => {
        state.inboxLoading = true;
        state.inboxError = null;
      })
      .addCase(fetchInbox.fulfilled, (state, action) => {
        state.inboxLoading = false;
        state.inbox = action.payload;
      })
      .addCase(fetchInbox.rejected, (state, action) => {
        state.inboxLoading = false;
        state.inboxError = String(action.payload || action.error.message);
      })
      .addCase(fetchConversation.pending, (state) => {
        state.conversationLoading = true;
        state.conversationError = null;
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        // Ignore late responses after the user switched chats.
        if (action.meta.arg !== state.activeConversationId) return;
        state.conversationLoading = false;
        state.conversation = action.payload;
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        if (action.meta.arg !== state.activeConversationId) return;
        state.conversationLoading = false;
        state.conversationError = String(action.payload || action.error.message);
      })
      .addCase(fetchMessages.pending, (state, action) => {
        if (action.meta.arg.conversationId !== state.activeConversationId) return;
        if (action.meta.arg.cursor) {
          state.messagesLoadingMore = true;
        } else {
          state.messagesLoading = true;
          state.messagesError = null;
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        // Server mark-reads on initial listMessages — clear badge even if the
        // user switched away before this response landed.
        if (!action.payload.append) {
          const inboxRow = state.inbox.find(
            (row) => row.conversation_id === action.payload.conversationId,
          );
          if (inboxRow) inboxRow.unread_count = 0;
        }

        if (action.payload.conversationId !== state.activeConversationId) {
          // Loading was reset in setActiveConversation on switch — do not
          // clear the active thread's in-flight spinner here.
          return;
        }
        state.messagesLoading = false;
        state.messagesLoadingMore = false;
        if (action.payload.append) {
          const existing = new Set(state.messages.map((m) => m.id));
          const older = action.payload.messages.filter((m) => !existing.has(m.id));
          state.messages = [...older, ...state.messages];
        } else {
          // Merge by id — realtime messages may have landed before this
          // response and must not be wiped from the open thread. Prefer local
          // is_read / liked_by_me (and matching like_count) over the snapshot.
          const localById = new Map(state.messages.map((m) => [m.id, m]));
          const merged = action.payload.messages.map((fetched) => {
            const local = localById.get(fetched.id);
            if (!local) return fetched;
            return {
              ...fetched,
              is_read: local.is_read || fetched.is_read,
              liked_by_me: local.liked_by_me,
              like_count:
                local.liked_by_me === fetched.liked_by_me ? fetched.like_count : local.like_count,
            };
          });
          const fetchedIds = new Set(merged.map((m) => m.id));
          const liveExtras = state.messages.filter((m) => !fetchedIds.has(m.id));
          state.messages = [...merged, ...liveExtras].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
        }
        state.nextCursor = action.payload.next_cursor;
        state.hasMore = action.payload.has_more;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        if (action.meta.arg.conversationId !== state.activeConversationId) return;
        state.messagesLoading = false;
        state.messagesLoadingMore = false;
        state.messagesError = String(action.payload || action.error.message);
      })
      .addCase(sendMessage.pending, (state) => {
        state.sendLoading = true;
        state.sendError = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sendLoading = false;
        state.quota = action.payload.quota;
        const message = action.payload.message;
        if (
          message.conversation_id === state.activeConversationId &&
          !state.messages.some((m) => m.id === message.id)
        ) {
          state.messages.push(message);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sendLoading = false;
        state.sendError = String(action.payload || action.error.message);
      })
      .addCase(uploadVoiceNote.pending, (state) => {
        state.sendLoading = true;
        state.sendError = null;
      })
      .addCase(uploadVoiceNote.fulfilled, (state, action) => {
        state.sendLoading = false;
        state.quota = action.payload.quota;
        const message = action.payload.message;
        if (
          message.conversation_id === state.activeConversationId &&
          !state.messages.some((m) => m.id === message.id)
        ) {
          state.messages.push(message);
        }
      })
      .addCase(uploadVoiceNote.rejected, (state, action) => {
        state.sendLoading = false;
        state.sendError = String(action.payload || action.error.message);
      })
      .addCase(toggleMessageLike.fulfilled, (state, action) => {
        const message = state.messages.find((m) => m.id === action.payload.message_id);
        if (message) {
          message.liked_by_me = action.payload.liked;
          message.like_count = action.payload.like_count;
        }
      });
  },
});

export const {
  resetMessagingState,
  setActiveConversation,
  clearSendError,
  applyRealtimeMessage,
  applyMessagesRead,
  applyLikeChanged,
  setLikedByMe,
  setPeerTyping,
  applyConversationStatus,
} = messagingSlice.actions;

export const selectMessaging = (state: RootState) => state.messaging;

export default messagingSlice.reducer;
