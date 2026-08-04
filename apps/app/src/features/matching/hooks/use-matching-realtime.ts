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
import { fetchNotifications } from '@/features/notifications/store/notifications-slice';
import { getCachedAuthUser } from '@/lib/auth';
import type { RootState } from '@/lib/store';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';

import type { PushToastItem } from '../types';

const PUSH_TOAST_LIFETIME_MS = 4200;
const MAX_VISIBLE_PUSH_TOASTS = 3;

function buildRealtimeUrl(): string | null {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) return null;

    const url = new URL(`${apiBase.replace(/\/$/, '')}/realtime`);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Shared match + messaging + profile-view-notification realtime subscription.
 * One socket avoids duplicate connections; HTTP write responses remain authoritative.
 * The access token lives in an HttpOnly cookie (see lib/auth.ts), so it isn't read here —
 * the browser attaches it to the WebSocket handshake automatically, the same way it does
 * for any other same-site request, and the server falls back to that cookie in verifyToken.
 */
export function useMatchingRealtime(enabled = true) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const socketRef = useRef<WebSocket | null>(null);
  const [pushToasts, setPushToasts] = useState<PushToastItem[]>([]);
  const nextToastId = useRef(0);
  const dismissTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Read on every render (not just at connect time) so a still-open socket knows whether
  // the user is currently looking at the notifications page — a push card would be
  // redundant there, since that page already shows the same event in the list.
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    return () => {
      Object.values(dismissTimers.current).forEach(clearTimeout);
      dismissTimers.current = {};
    };
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      const url = buildRealtimeUrl();
      if (!url) return;

      let closedByEffect = false;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let pingTimer: ReturnType<typeof setInterval> | null = null;
      const markReadScheduler = createDebouncedMarkRead((conversationId) => {
        void dispatch(markConversationRead(conversationId));
      });

      const connect = () => {
        if (closedByEffect) return;

        try {
          const socket = new WebSocket(url);
          socketRef.current = socket;

          socket.onopen = () => {
            if (pingTimer) clearInterval(pingTimer);
            pingTimer = setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ event: 'ping', payload: {} }));
              }
            }, 25_000);
          };

          socket.onmessage = (event) => {
            try {
              const message = JSON.parse(String(event.data)) as RealtimeMessage &
                MessagingRealtimePayload;

              if (message.event === 'pong') return;

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
                const viewer = getCachedAuthUser<{ id?: string }>();
                dispatch(
                  applyLikeChanged({
                    message_id: message.payload.message_id,
                    liked: Boolean(message.payload.liked),
                    like_count: Number(message.payload.like_count ?? 0),
                    user_id: String(message.payload.user_id || ''),
                    viewer_id: viewer?.id,
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
                return;
              }

              if (message.event === 'notification_profile_view') {
                void dispatch(fetchNotifications());
                if (message.payload?.viewerName && pathnameRef.current !== '/notifications') {
                  const id = String(nextToastId.current++);
                  const viewerName = message.payload.viewerName;
                  setPushToasts((prev) =>
                    [
                      {
                        id,
                        title: 'Vue de profil',
                        body: `Quelqu'un nommé "${viewerName}" a consulté votre profil.`,
                        viewerImage: message.payload?.viewerImage ?? null,
                      },
                      ...prev,
                    ].slice(0, MAX_VISIBLE_PUSH_TOASTS),
                  );
                  dismissTimers.current[id] = setTimeout(() => {
                    setPushToasts((prev) => prev.filter((item) => item.id !== id));
                    delete dismissTimers.current[id];
                  }, PUSH_TOAST_LIFETIME_MS);
                }
              }
            } catch {
              // Ignore malformed payloads — keep the socket open.
            }
          };

          socket.onclose = () => {
            socketRef.current = null;
            if (pingTimer) {
              clearInterval(pingTimer);
              pingTimer = null;
            }
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
        if (pingTimer) clearInterval(pingTimer);
        socketRef.current?.close();
        socketRef.current = null;
      };
    } catch {
      return undefined;
    }
  }, [dispatch, enabled, store]);

  return { pushToasts };
}
