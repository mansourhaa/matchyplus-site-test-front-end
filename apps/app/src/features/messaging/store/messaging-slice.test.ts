import { describe, expect, it } from 'vitest';

import messagingReducer, {
  applyRealtimeMessage,
  resetMessagingState,
  setPeerTyping,
} from './messaging-slice';

describe('messagingSlice', () => {
  it('appends a realtime message to the active conversation', () => {
    const withActive = messagingReducer(undefined, {
      type: 'messaging/setActiveConversation',
      payload: 'conv-1',
    });

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

  it('tracks peer typing for the active conversation only', () => {
    let state = messagingReducer(undefined, {
      type: 'messaging/setActiveConversation',
      payload: 'conv-1',
    });
    state = messagingReducer(state, setPeerTyping({ conversation_id: 'conv-1', typing: true }));
    expect(state.peerTyping).toBe(true);

    state = messagingReducer(state, setPeerTyping({ conversation_id: 'conv-2', typing: true }));
    expect(state.peerTyping).toBe(true);

    state = messagingReducer(state, resetMessagingState());
    expect(state.messages).toEqual([]);
    expect(state.peerTyping).toBe(false);
  });
});
