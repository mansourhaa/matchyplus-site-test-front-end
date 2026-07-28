import { FastifyPluginAsync, FastifyRequest } from 'fastify';

type RealtimeQuery = {
  access_token?: string;
};

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
    const queryToken = request.query?.access_token;
    if (queryToken && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${queryToken}`;
    }
    await fastify.verifyToken(request);
  }

  fastify.get<{ Querystring: RealtimeQuery }>(
    '/',
    { websocket: true, preHandler: [bindQueryToken] },
    (socket, request) => {
      const userId = request.loggedUser.id;
      fastify.userRealtime.subscribe(userId, socket);

      socket.on('close', () => {
        fastify.userRealtime.unsubscribe(userId, socket);
      });
    },
  );
};

export default routes;
