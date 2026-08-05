import { FastifyPluginAsync, FastifyRequest } from 'fastify';

import {
  REALTIME_MAX_INBOUND_BYTES,
  REALTIME_TYPING_MIN_INTERVAL_MS,
  shouldThrottleTypingEvent,
} from '../../../constants/realtime.js';
import { realtimeSchema } from '../../../schemas/v1/matching.js';
import { ConversationService } from '../../../services/conversation.js';
import { RealtimeQuery } from '../../../types/matching.js';

type InboundRealtime = {
  event?: string;
  payload?: {
    conversation_id?: string;
    is_typing?: boolean;
  };
};

/**
 * Authenticated websocket for match + messaging realtime events.
 * Client may send typing pings / keepalive as JSON `{ event, payload }`.
 * Server pushes JSON `{ event, payload }`.
 *
 * Browsers cannot set Authorization on the WebSocket constructor, so the
 * client may pass `?access_token=` which we promote to a Bearer header before
 * `verifyToken` runs. Header-based clients keep working unchanged.
 */
const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const conversations = new ConversationService({
    prisma: fastify.prisma,
    notify: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  /** userId:conversationId → last *typing* emit timestamp (`stop_typing` is never throttled). */
  const typingThrottle = new Map<string, number>();
  /** Serialize setTyping per key so stop cannot lose a race to an in-flight typing. */
  const typingOpChain = new Map<string, Promise<void>>();

  function enqueueTypingOp(key: string, op: () => Promise<void>): void {
    const prev = typingOpChain.get(key) ?? Promise.resolve();
    const next = prev
      .catch(() => undefined)
      .then(op)
      .catch(() => undefined)
      .finally(() => {
        if (typingOpChain.get(key) === next) typingOpChain.delete(key);
      });
    typingOpChain.set(key, next);
  }

  async function bindQueryToken(request: FastifyRequest<{ Querystring: RealtimeQuery }>) {
    try {
      const queryToken = request.query?.access_token;
      if (queryToken && !request.headers.authorization) {
        request.headers.authorization = `Bearer ${queryToken}`;
      }
    } catch (err) {
      throw err;
    }
  }

  fastify.get<{ Querystring: RealtimeQuery }>(
    '/',
    {
      websocket: true,
      schema: realtimeSchema,
      preHandler: [bindQueryToken, fastify.verifyToken],
    },
    (socket, request) => {
      const userId = request.loggedUser.id;
      try {
        fastify.userRealtime.subscribe(userId, socket);
      } catch (err) {
        throw err;
      }

      socket.on('message', (raw) => {
        void (async () => {
          try {
            const rawStr = String(raw);
            if (Buffer.byteLength(rawStr, 'utf8') > REALTIME_MAX_INBOUND_BYTES) {
              return;
            }

            const parsed = JSON.parse(rawStr) as InboundRealtime;

            if (parsed.event === 'ping') {
              if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ event: 'pong', payload: {} }));
              }
              return;
            }

            const conversationId = parsed.payload?.conversation_id;
            if (!conversationId) return;

            if (parsed.event === 'typing' || parsed.event === 'stop_typing') {
              const key = `${userId}:${conversationId}`;
              const now = Date.now();
              const last = typingThrottle.get(key) ?? 0;
              if (
                shouldThrottleTypingEvent(parsed.event, last, now, REALTIME_TYPING_MIN_INTERVAL_MS)
              ) {
                return;
              }

              const isTyping = parsed.event === 'typing';
              // Stamp before enqueue so rapid frames stay throttled while setTyping
              // is in flight; clear the stamp if delivery fails so peers can retry.
              if (isTyping) {
                typingThrottle.set(key, now);
              } else {
                // Clear so the next typing after stop is never blocked by the prior stamp.
                typingThrottle.delete(key);
              }

              enqueueTypingOp(key, async () => {
                try {
                  await conversations.setTyping(userId, conversationId, isTyping);
                } catch {
                  if (isTyping) typingThrottle.delete(key);
                }
              });
            }
          } catch {
            // Ignore malformed client frames — keep the socket open.
          }
        })();
      });

      socket.on('close', () => {
        fastify.userRealtime.unsubscribe(userId, socket);
        for (const key of typingThrottle.keys()) {
          if (key.startsWith(`${userId}:`)) typingThrottle.delete(key);
        }
      });
    },
  );
};

export default routes;
