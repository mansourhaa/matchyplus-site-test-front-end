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
