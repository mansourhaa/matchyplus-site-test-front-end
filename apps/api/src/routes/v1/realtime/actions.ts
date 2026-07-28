import { FastifyPluginAsync } from 'fastify';

/**
 * Authenticated websocket for match / swipe realtime events.
 * Client sends nothing after connect; server pushes JSON `{ event, payload }`.
 */
const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', { websocket: true, preHandler: [fastify.verifyToken] }, (socket, request) => {
    const userId = request.loggedUser.id;
    fastify.userRealtime.subscribe(userId, socket);

    socket.on('close', () => {
      fastify.userRealtime.unsubscribe(userId, socket);
    });
  });
};

export default routes;
