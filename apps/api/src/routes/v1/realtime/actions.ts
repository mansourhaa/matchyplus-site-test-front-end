import { FastifyPluginAsync, FastifyRequest } from 'fastify';

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
 * Client may send typing pings as JSON `{ event, payload }`.
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
            const parsed = JSON.parse(String(raw)) as InboundRealtime;
            const conversationId = parsed.payload?.conversation_id;
            if (!conversationId) return;

            if (parsed.event === 'typing' || parsed.event === 'stop_typing') {
              await conversations.setTyping(userId, conversationId, parsed.event === 'typing');
            }
          } catch {
            // Ignore malformed client frames — keep the socket open.
          }
        })();
      });

      socket.on('close', () => {
        fastify.userRealtime.unsubscribe(userId, socket);
      });
    },
  );
};

export default routes;
