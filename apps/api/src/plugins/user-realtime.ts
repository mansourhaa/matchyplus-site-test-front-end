import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { WebSocket } from 'ws';

/**
 * In-process user realtime fan-out for match and messaging events.
 * Multi-instance deployments should later bridge via Redis pub/sub;
 * HTTP payloads remain the source of truth for the acting user on writes.
 */
declare module 'fastify' {
  interface FastifyInstance {
    notifyUser: (userId: string, event: string, payload: Record<string, unknown>) => void;
    userRealtime: {
      subscribe: (userId: string, socket: WebSocket) => void;
      unsubscribe: (userId: string, socket: WebSocket) => void;
    };
  }
}

async function userRealtime(fastify: FastifyInstance) {
  const rooms = new Map<string, Set<WebSocket>>();

  function subscribe(userId: string, socket: WebSocket) {
    let set = rooms.get(userId);
    if (!set) {
      set = new Set();
      rooms.set(userId, set);
    }
    set.add(socket);
  }

  function unsubscribe(userId: string, socket: WebSocket) {
    const set = rooms.get(userId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) rooms.delete(userId);
  }

  function notifyUser(userId: string, event: string, payload: Record<string, unknown>) {
    const set = rooms.get(userId);
    if (!set?.size) return;
    const message = JSON.stringify({ event, payload });
    for (const socket of set) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }

  fastify.decorate('notifyUser', notifyUser);
  fastify.decorate('userRealtime', { subscribe, unsubscribe });
}

export default fp(userRealtime, {
  name: 'user-realtime',
  dependencies: ['websocket'],
});
