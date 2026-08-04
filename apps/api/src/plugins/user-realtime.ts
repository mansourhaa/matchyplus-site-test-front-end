import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { WebSocket } from 'ws';

import { RealtimeFanoutService } from '../services/realtime-fanout.js';

/**
 * User realtime fan-out for match and messaging events.
 * Delivers to local WebSocket rooms and, when Redis is configured, fans out
 * via Redis Streams so every API instance can reach sockets it owns.
 * HTTP write responses remain authoritative for the acting user.
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

  function deliverLocal(userId: string, event: string, payload: Record<string, unknown>) {
    const set = rooms.get(userId);
    if (!set?.size) return;
    const message = JSON.stringify({ event, payload });
    for (const socket of set) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }

  const fanout = new RealtimeFanoutService({
    redis: fastify.redisClient ?? null,
    deliverLocal,
    log: {
      info: (obj, msg) => fastify.log.info(obj, msg),
      warn: (obj, msg) => fastify.log.warn(obj, msg),
      error: (obj, msg) => fastify.log.error(obj, msg),
    },
  });

  function notifyUser(userId: string, event: string, payload: Record<string, unknown>) {
    fanout.notifyUser(userId, event, payload);
  }

  fastify.decorate('notifyUser', notifyUser);
  fastify.decorate('userRealtime', { subscribe, unsubscribe });

  fastify.addHook('onClose', async () => {
    await fanout.stop();
  });
}

export default fp(userRealtime, {
  name: 'user-realtime',
  dependencies: ['websocket', 'redis'],
});
