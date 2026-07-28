'use client';

import { useAppDispatch } from '@/features/auth/hooks/use-app-dispatch';
import { useEffect, useRef } from 'react';

import { fetchMatchState } from '../store/matching-slice';
import type { RealtimeMessage } from '../types';

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
 * Subscribe to match realtime events and refresh match/pending state.
 * Uses the same access-token session source as the rest of the matching client;
 * auth-session migration owns replacing that source later.
 */
export function useMatchingRealtime(enabled = true) {
  const dispatch = useAppDispatch();
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

      const connect = () => {
        if (closedByEffect) return;

        try {
          const socket = new WebSocket(url);
          socketRef.current = socket;

          socket.onmessage = (event) => {
            try {
              const message = JSON.parse(String(event.data)) as RealtimeMessage;
              if (
                message.event === 'notification_match' &&
                message.payload?.event_type === 'match'
              ) {
                void dispatch(fetchMatchState());
                return;
              }
              if (message.event === 'match_removed') {
                void dispatch(fetchMatchState());
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
        if (reconnectTimer) clearTimeout(reconnectTimer);
        socketRef.current?.close();
        socketRef.current = null;
      };
    } catch {
      return undefined;
    }
  }, [dispatch, enabled]);
}
