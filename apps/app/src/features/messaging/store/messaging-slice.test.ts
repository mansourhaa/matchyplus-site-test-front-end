import { describe, expect, it } from 'vitest';

import messagingReducer, {
  applyRealtimeMessage,
  resetMessagingState,
  setActiveConversation,
  setPeerTyping,
} from './messaging-slice';

describe('messagingSlice', () => {
  it('appends a realtime message to the active conversation', () => {
    const withActive = messagingReducer(undefined, setActiveConversation('conv-1'));

    const next = messagingReducer(
      withActive,
      applyRealtimeMessage({
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'u2',
        content: 'hi',
        message_type: 'TEXT',
        media_url: null,
        is_read: false,
        created_at: '2026-08-03T12:00:00.000Z',
        liked_by_me: false,
        like_count: 0,
      }),
    );

    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]?.content).toBe('hi');
    expect(next.peerTyping).toBe(false);
  });

  it('does not bump unread for the viewer’s own new_message on another thread', () => {
    let state = messagingReducer(undefined, setActiveConversation('conv-1'));
    state = {
      ...state,
      inbox: [
        {
          conversation_id: 'conv-2',
          match_id: 'match-2',
          has_active_match: true,
          peer: null,
          last_message: null,
          unread_count: 0,
          i_blocked: false,
          blocked_me: false,
          can_send: true,
          updated_at: '2026-08-03T12:00:00.000Z',
          created_at: '2026-08-03T12:00:00.000Z',
        },
      ],
    };

    state = messagingReducer(
      state,
      applyRealtimeMessage({
        id: 'msg-9',
        conversation_id: 'conv-2',
        sender_id: 'me',
        content: 'sent elsewhere',
        message_type: 'TEXT',
        media_url: null,
        is_read: false,
        created_at: '2026-08-03T12:01:00.000Z',
        liked_by_me: false,
        like_count: 0,
        viewer_id: 'me',
      }),
    );

    expect(state.inbox[0]?.unread_count).toBe(0);
  });

  it('ignores stale message fetches after switching conversations', () => {
    let state = messagingReducer(undefined, setActiveConversation('conv-b'));
    state = {
      ...state,
      inbox: [
        {
          conversation_id: 'conv-a',
          match_id: 'match-a',
          has_active_match: true,
          peer: null,
          last_message: null,
          unread_count: 4,
          i_blocked: false,
          blocked_me: false,
          can_send: true,
          updated_at: '2026-08-03T12:00:00.000Z',
          created_at: '2026-08-03T12:00:00.000Z',
        },
      ],
    };
    state = messagingReducer(state, {
      type: 'messaging/fetchMessages/fulfilled',
      meta: { arg: { conversationId: 'conv-a' } },
      payload: {
        conversationId: 'conv-a',
        append: false,
        messages: [
          {
            id: 'old',
            conversation_id: 'conv-a',
            sender_id: 'u1',
            content: 'stale',
            message_type: 'TEXT',
            media_url: null,
            is_read: true,
            created_at: '2026-08-03T12:00:00.000Z',
            liked_by_me: false,
            like_count: 0,
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });

    expect(state.messages).toEqual([]);
    expect(state.inbox[0]?.unread_count).toBe(0);
  });

  it('keeps realtime messages when the initial fetch lands late', () => {
    let state = messagingReducer(undefined, setActiveConversation('conv-1'));
    state = messagingReducer(
      state,
      applyRealtimeMessage({
        id: 'msg-live',
        conversation_id: 'conv-1',
        sender_id: 'peer',
        content: 'arrived over the socket',
        message_type: 'TEXT',
        media_url: null,
        is_read: false,
        created_at: '2026-08-03T12:05:00.000Z',
        liked_by_me: false,
        like_count: 0,
      }),
    );

    state = messagingReducer(state, {
      type: 'messaging/fetchMessages/fulfilled',
      meta: { arg: { conversationId: 'conv-1' } },
      payload: {
        conversationId: 'conv-1',
        append: false,
        messages: [
          {
            id: 'msg-old',
            conversation_id: 'conv-1',
            sender_id: 'peer',
            content: 'from history',
            message_type: 'TEXT',
            media_url: null,
            is_read: true,
            created_at: '2026-08-03T12:00:00.000Z',
            liked_by_me: false,
            like_count: 0,
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });

    expect(state.messages.map((m) => m.id)).toEqual(['msg-old', 'msg-live']);
  });

  it('does not append a late send into a different active conversation', () => {
    let state = messagingReducer(undefined, setActiveConversation('conv-b'));
    state = messagingReducer(state, {
      type: 'messaging/sendMessage/fulfilled',
      payload: {
        quota: {
          plan: 'FREE',
          unlimited: true,
          used: null,
          limit: null,
          remaining: null,
          resets_at: 'midnight_utc',
        },
        message: {
          id: 'msg-late',
          conversation_id: 'conv-a',
          sender_id: 'me',
          content: 'wrong thread',
          message_type: 'TEXT',
          media_url: null,
          is_read: false,
          created_at: '2026-08-03T12:02:00.000Z',
          liked_by_me: false,
          like_count: 0,
        },
      },
    });

    expect(state.sendLoading).toBe(false);
    expect(state.quota?.unlimited).toBe(true);
    expect(state.messages).toEqual([]);
  });

  it('clears inbox unread after the initial messages fetch', () => {
    let state = messagingReducer(undefined, setActiveConversation('conv-1'));
    state = {
      ...state,
      inbox: [
        {
          conversation_id: 'conv-1',
          match_id: 'match-1',
          has_active_match: true,
          peer: null,
          last_message: null,
          unread_count: 3,
          i_blocked: false,
          blocked_me: false,
          can_send: true,
          updated_at: '2026-08-03T12:00:00.000Z',
          created_at: '2026-08-03T12:00:00.000Z',
        },
      ],
    };

    state = messagingReducer(state, {
      type: 'messaging/fetchMessages/fulfilled',
      meta: { arg: { conversationId: 'conv-1' } },
      payload: {
        conversationId: 'conv-1',
        append: false,
        messages: [],
        next_cursor: null,
        has_more: false,
      },
    });

    expect(state.inbox[0]?.unread_count).toBe(0);
  });

  it('tracks peer typing for the active conversation only', () => {
    let state = messagingReducer(undefined, setActiveConversation('conv-1'));
    state = messagingReducer(state, setPeerTyping({ conversation_id: 'conv-1', typing: true }));
    expect(state.peerTyping).toBe(true);

    state = messagingReducer(state, setPeerTyping({ conversation_id: 'conv-2', typing: true }));
    expect(state.peerTyping).toBe(true);

    state = messagingReducer(state, resetMessagingState());
    expect(state.messages).toEqual([]);
    expect(state.peerTyping).toBe(false);
  });
});
