import { FastifyPluginAsync, FastifyRequest } from 'fastify';

import { realtimeSchema } from '../../../schemas/v1/matching.js';
import { RealtimeQuery } from '../../../types/matching.js';

/**
 * Authenticated websocket for match / swipe realtime events.
 * Client sends nothing after connect; server pushes JSON `{ event, payload }`.
 *
 * Browsers cannot set Authorization on the WebSocket constructor, so the
 * client may pass `?access_token=` which we promote to a Bearer header before
 * `verifyToken` runs. Header-based clients keep working unchanged.
 */
const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
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

      socket.on('close', () => {
        fastify.userRealtime.unsubscribe(userId, socket);
      });
    },
  );
};

export default routes;
