'use client';

import { useAppDispatch } from '@/features/auth/hooks/use-app-dispatch';
import { fetchMatchState } from '@/features/matching/store/matching-slice';
import type { RealtimeMessage } from '@/features/matching/types';
import {
  createDebouncedMarkRead,
  shouldMarkActiveThreadRead,
} from '@/features/messaging/lib/active-thread-read';
import {
  applyConversationStatus,
  applyLikeChanged,
  applyMessagesRead,
  applyRealtimeMessage,
  fetchInbox,
  markConversationRead,
  setPeerTyping,
} from '@/features/messaging/store/messaging-slice';
import type { ChatMessage, MessagingRealtimePayload } from '@/features/messaging/types';
import { getCachedAuthUser } from '@/lib/auth';
import type { RootState } from '@/lib/store';
import { useEffect, useRef } from 'react';
import { useStore } from 'react-redux';

function buildRealtimeUrl(accessToken: string): string | null {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) return null;

    const url = new URL(`${apiBase.replace(/\/$/, '')}/realtime`);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('access_token', accessToken);
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Shared match + messaging realtime subscription.
 * One socket avoids duplicate connections; HTTP write responses remain authoritative.
 */
export function useMatchingRealtime(enabled = true) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;

      const url = buildRealtimeUrl(token);
      if (!url) return;

      let closedByEffect = false;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      const markReadScheduler = createDebouncedMarkRead((conversationId) => {
        void dispatch(markConversationRead(conversationId));
      });

      const connect = () => {
        if (closedByEffect) return;

        try {
          const socket = new WebSocket(url);
          socketRef.current = socket;

          socket.onmessage = (event) => {
            try {
              const message = JSON.parse(String(event.data)) as RealtimeMessage &
                MessagingRealtimePayload;

              if (
                message.event === 'notification_match' &&
                message.payload?.event_type === 'match'
              ) {
                void dispatch(fetchMatchState());
                void dispatch(fetchInbox());
                return;
              }
              if (message.event === 'match_removed') {
                void dispatch(fetchMatchState());
                void dispatch(fetchInbox());
                return;
              }

              if (message.event === 'new_message' && message.payload?.id) {
                const chatMessage = message.payload as unknown as ChatMessage;
                const viewer = getCachedAuthUser<{ id?: string }>();
                dispatch(
                  applyRealtimeMessage({
                    ...chatMessage,
                    viewer_id: viewer?.id,
                  }),
                );
                if (
                  shouldMarkActiveThreadRead({
                    activeConversationId: store.getState().messaging.activeConversationId,
                    conversationId: chatMessage.conversation_id,
                    senderId: chatMessage.sender_id,
                    viewerId: viewer?.id,
                  })
                ) {
                  markReadScheduler.schedule(chatMessage.conversation_id);
                }
                return;
              }

              if (message.event === 'messages_read' && message.payload?.conversation_id) {
                dispatch(
                  applyMessagesRead({
                    conversation_id: message.payload.conversation_id,
                    reader_id: String(message.payload.reader_id || ''),
                  }),
                );
                return;
              }

              if (message.event === 'user_typing' && message.payload?.conversation_id) {
                dispatch(
                  setPeerTyping({
                    conversation_id: message.payload.conversation_id,
                    typing: true,
                  }),
                );
                return;
              }

              if (message.event === 'user_stop_typing' && message.payload?.conversation_id) {
                dispatch(
                  setPeerTyping({
                    conversation_id: message.payload.conversation_id,
                    typing: false,
                  }),
                );
                return;
              }

              if (message.event === 'message_like_changed' && message.payload?.message_id) {
                dispatch(
                  applyLikeChanged({
                    message_id: message.payload.message_id,
                    liked: Boolean(message.payload.liked),
                    like_count: Number(message.payload.like_count ?? 0),
                    user_id: String(message.payload.user_id || ''),
                  }),
                );
                return;
              }

              if (
                (message.event === 'conversation_status_changed' ||
                  message.event === 'conversation_block_status_changed') &&
                message.payload?.conversation_id
              ) {
                dispatch(
                  applyConversationStatus({
                    conversation_id: message.payload.conversation_id,
                    has_active_match: message.payload.has_active_match,
                    can_send: message.payload.can_send,
                    i_blocked: message.payload.i_blocked,
                    blocked_me: message.payload.blocked_me,
                  }),
                );
                void dispatch(fetchInbox());
              }
            } catch {
              // Ignore malformed payloads — keep the socket open.
            }
          };

          socket.onclose = () => {
            socketRef.current = null;
            if (closedByEffect) return;
            reconnectTimer = setTimeout(connect, 3000);
          };
        } catch {
          if (closedByEffect) return;
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      connect();

      return () => {
        closedByEffect = true;
        markReadScheduler.cancelAll();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        socketRef.current?.close();
        socketRef.current = null;
      };
    } catch {
      return undefined;
    }
  }, [dispatch, enabled, store]);
}
