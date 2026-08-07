import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';

import {
  REALTIME_MAX_INBOUND_BYTES,
  REALTIME_TYPING_HOLDER_TTL_SEC,
  REALTIME_TYPING_MIN_INTERVAL_MS,
  shouldThrottleTypingEvent,
} from '../../../constants/realtime.js';
import { expectedAccessAudience } from '../../../plugins/authorization.js';
import { realtimeSchema } from '../../../schemas/v1/matching.js';
import { ConversationService } from '../../../services/conversation.js';
import { RealtimeQuery } from '../../../types/matching.js';
import { ADMIN_SESSION_COOKIE } from '../../../utils/admin-session.js';
import { MEMBER_ACCESS_COOKIE } from '../../../utils/member-session.js';

/** Cap must send `{ event: "auth" }` soon after upgrade when the handshake had no JWT. */
const REALTIME_DEFERRED_AUTH_TIMEOUT_MS = 5_000;

type InboundRealtime = {
  event?: string;
  payload?: {
    conversation_id?: string;
    is_typing?: boolean;
    access_token?: string;
  };
};

function typingConvRedisKey(userConvKey: string): string {
  return `realtime:typing:conv:${userConvKey}`;
}

function typingClaimRedisKey(claimId: string): string {
  return `realtime:typing:claim:${claimId}`;
}

/**
 * Authenticated websocket for match + messaging realtime events.
 * Client may send typing pings / keepalive as JSON `{ event, payload }`.
 * Server pushes JSON `{ event, payload }`.
 *
 * Auth channels (prefer earlier):
 * 1. Cookie / Authorization header on the upgrade (web + native HTTP clients)
 * 2. Deferred first-frame `{ event: "auth", payload: { access_token } }` (Capacitor)
 *
 * Query-string `?access_token=` is intentionally unsupported (tokens must not land in logs).
 */
const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  const conversations = new ConversationService({
    prisma: fastify.prisma,
    notify: (userId, event, payload) => fastify.notifyUser(userId, event, payload),
  });

  /** userId:conversationId → last *typing* emit timestamp (`stop_typing` is never throttled). */
  const typingThrottle = new Map<string, number>();
  /**
   * Serialize claim/touch/release + setTyping per key so concurrent frames and
   * close cannot interleave Redis claim state with fan-out.
   */
  const typingOpChain = new Map<string, Promise<void>>();
  /**
   * In-process fallback when Redis is unset: userId:conversationId → claim ids.
   * With Redis, each socket claim is a SET member + per-claim key so TTL expiry
   * on one tab cannot undercount other holders.
   */
  const localTypingHolders = new Map<string, Set<string>>();

  function enqueueTypingOp(key: string, op: () => Promise<void>): Promise<void> {
    const prev = typingOpChain.get(key) ?? Promise.resolve();
    const next = prev
      .catch(() => undefined)
      .then(op)
      .catch(() => undefined)
      .finally(() => {
        if (typingOpChain.get(key) === next) typingOpChain.delete(key);
      });
    typingOpChain.set(key, next);
    return next;
  }

  async function claimTyping(userConvKey: string, claimId: string): Promise<void> {
    const redis = fastify.redisClient;
    if (!redis) {
      let set = localTypingHolders.get(userConvKey);
      if (!set) {
        set = new Set();
        localTypingHolders.set(userConvKey, set);
      }
      set.add(claimId);
      return;
    }
    const convKey = typingConvRedisKey(userConvKey);
    const claimKey = typingClaimRedisKey(claimId);
    await redis.set(claimKey, userConvKey, 'EX', REALTIME_TYPING_HOLDER_TTL_SEC);
    await redis.sadd(convKey, claimId);
    await redis.expire(convKey, REALTIME_TYPING_HOLDER_TTL_SEC);
  }

  /**
   * Refresh this socket's claim TTL; recreate the claim if Redis expired it
   * while the socket still intends to type (does not invent claims for others).
   */
  async function touchTyping(userConvKey: string, claimId: string): Promise<void> {
    const redis = fastify.redisClient;
    if (!redis) return;
    const convKey = typingConvRedisKey(userConvKey);
    const claimKey = typingClaimRedisKey(claimId);
    const exists = await redis.exists(claimKey);
    if (!exists) {
      await redis.set(claimKey, userConvKey, 'EX', REALTIME_TYPING_HOLDER_TTL_SEC);
      await redis.sadd(convKey, claimId);
    } else {
      await redis.expire(claimKey, REALTIME_TYPING_HOLDER_TTL_SEC);
    }
    await redis.expire(convKey, REALTIME_TYPING_HOLDER_TTL_SEC);
  }

  /** Returns true when no other live claim still holds typing for this user/conversation. */
  async function releaseTyping(userConvKey: string, claimId: string): Promise<boolean> {
    const redis = fastify.redisClient;
    if (!redis) {
      const set = localTypingHolders.get(userConvKey);
      if (!set) return true;
      set.delete(claimId);
      if (set.size === 0) {
        localTypingHolders.delete(userConvKey);
        return true;
      }
      return false;
    }
    const convKey = typingConvRedisKey(userConvKey);
    const claimKey = typingClaimRedisKey(claimId);
    await redis.del(claimKey);
    await redis.srem(convKey, claimId);
    // Claim keys expire independently of the SET — prune orphans so SCARD cannot
    // stay > 0 after every real socket has stopped.
    const members = await redis.smembers(convKey);
    if (members.length > 0) {
      const pipe = redis.pipeline();
      for (const member of members) {
        pipe.exists(typingClaimRedisKey(member));
      }
      const existsReplies = await pipe.exec();
      const prune = redis.pipeline();
      let pruned = false;
      for (let i = 0; i < members.length; i++) {
        const alive = Number(existsReplies?.[i]?.[1] ?? 0) > 0;
        if (!alive) {
          prune.srem(convKey, members[i]!);
          pruned = true;
        }
      }
      if (pruned) await prune.exec();
    }
    const remaining = await redis.scard(convKey);
    if (remaining <= 0) {
      await redis.del(convKey);
      return true;
    }
    await redis.expire(convKey, REALTIME_TYPING_HOLDER_TTL_SEC);
    return false;
  }

  function hasUpgradeAuthHint(request: FastifyRequest<{ Querystring: RealtimeQuery }>): boolean {
    if (request.headers.authorization) return true;
    const cookies = request.cookies ?? {};
    // Route-aware: realtime is a member surface — only the member cookie counts.
    if (expectedAccessAudience(request) === 'admin') {
      return Boolean(cookies[ADMIN_SESSION_COOKIE]);
    }
    return Boolean(cookies[MEMBER_ACCESS_COOKIE]);
  }

  /**
   * Verify when the upgrade already carries credentials. Cap often has neither
   * cookie nor Authorization on the API host — leave `loggedUser` unset and wait for
   * the first-frame `auth` event so the JWT never appears in access-log URLs.
   */
  async function verifyTokenOrDefer(request: FastifyRequest<{ Querystring: RealtimeQuery }>) {
    if (!hasUpgradeAuthHint(request)) return;
    await fastify.verifyToken(request);
  }

  fastify.get<{ Querystring: RealtimeQuery }>(
    '/',
    {
      websocket: true,
      schema: realtimeSchema,
      preHandler: [verifyTokenOrDefer],
    },
    (socket, request) => {
      /** conversationId → claim id for this socket (unique per typing session). */
      const claimByConversation = new Map<string, string>();
      /** Conversations where this socket stamped the shared typing throttle. */
      const stampedConversations = new Set<string>();
      /** Set on close so queued typing ops bail before claiming / fanning out. */
      let socketClosed = false;
      let userId: string | null = request.loggedUser?.id ?? null;
      let deferredAuthTimer: ReturnType<typeof setTimeout> | null = null;

      const activate = (id: string) => {
        userId = id;
        if (deferredAuthTimer) {
          clearTimeout(deferredAuthTimer);
          deferredAuthTimer = null;
        }
        fastify.userRealtime.subscribe(id, socket);
      };

      if (userId) {
        activate(userId);
      } else {
        deferredAuthTimer = setTimeout(() => {
          if (!userId && socket.readyState === socket.OPEN) {
            socket.close();
          }
        }, REALTIME_DEFERRED_AUTH_TIMEOUT_MS);
      }

      socket.on('message', (raw) => {
        void (async () => {
          try {
            if (socketClosed || socket.readyState !== socket.OPEN) return;

            const rawStr = String(raw);
            if (Buffer.byteLength(rawStr, 'utf8') > REALTIME_MAX_INBOUND_BYTES) {
              return;
            }

            const parsed = JSON.parse(rawStr) as InboundRealtime;

            if (!userId) {
              const token = parsed.payload?.access_token?.trim();
              if (parsed.event !== 'auth' || !token) {
                socket.close();
                return;
              }
              try {
                request.headers.authorization = `Bearer ${token}`;
                await fastify.verifyToken(request);
                const id = request.loggedUser?.id;
                if (!id) {
                  socket.close();
                  return;
                }
                activate(id);
                if (socket.readyState === socket.OPEN) {
                  socket.send(JSON.stringify({ event: 'auth_ok', payload: {} }));
                }
              } catch {
                socket.close();
              }
              return;
            }

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
              const isTyping = parsed.event === 'typing';

              if (
                shouldThrottleTypingEvent(parsed.event, last, now, REALTIME_TYPING_MIN_INTERVAL_MS)
              ) {
                // Still acquire/refresh a claim so a second tab becomes a holder without
                // re-fanning setTyping(true) (peer already has typing=true from first emit).
                if (isTyping && !socketClosed) {
                  void enqueueTypingOp(key, async () => {
                    if (socketClosed) return;
                    let claimId = claimByConversation.get(conversationId);
                    if (!claimId) {
                      claimId = randomUUID();
                      claimByConversation.set(conversationId, claimId);
                      await claimTyping(key, claimId);
                      if (socketClosed || claimByConversation.get(conversationId) !== claimId) {
                        if (claimByConversation.get(conversationId) === claimId) {
                          claimByConversation.delete(conversationId);
                          await releaseTyping(key, claimId);
                        }
                      }
                      return;
                    }
                    await touchTyping(key, claimId);
                  });
                }
                return;
              }

              if (isTyping) {
                typingThrottle.set(key, now);
                stampedConversations.add(conversationId);
                void enqueueTypingOp(key, async () => {
                  if (socketClosed || !userId) return;
                  let claimId = claimByConversation.get(conversationId);
                  if (!claimId) {
                    claimId = randomUUID();
                    claimByConversation.set(conversationId, claimId);
                    await claimTyping(key, claimId);
                  } else {
                    await touchTyping(key, claimId);
                  }
                  if (socketClosed || claimByConversation.get(conversationId) !== claimId) {
                    if (claimByConversation.get(conversationId) === claimId) {
                      claimByConversation.delete(conversationId);
                      await releaseTyping(key, claimId);
                    }
                    return;
                  }
                  try {
                    await conversations.setTyping(userId, conversationId, true);
                  } catch {
                    typingThrottle.delete(key);
                    if (claimByConversation.get(conversationId) === claimId) {
                      claimByConversation.delete(conversationId);
                      await releaseTyping(key, claimId);
                    }
                  }
                });
              } else {
                typingThrottle.delete(key);
                stampedConversations.delete(conversationId);
                void enqueueTypingOp(key, async () => {
                  if (!userId) return;
                  const claimId = claimByConversation.get(conversationId);
                  if (!claimId) return;
                  claimByConversation.delete(conversationId);
                  if (await releaseTyping(key, claimId)) {
                    try {
                      await conversations.setTyping(userId, conversationId, false);
                    } catch {
                      // Best-effort stop.
                    }
                  }
                });
              }
            }
          } catch {
            // Ignore malformed client frames — keep the socket open.
          }
        })();
      });

      socket.on('close', () => {
        socketClosed = true;
        if (deferredAuthTimer) {
          clearTimeout(deferredAuthTimer);
          deferredAuthTimer = null;
        }
        if (userId) {
          fastify.userRealtime.unsubscribe(userId, socket);
          for (const conversationId of stampedConversations) {
            typingThrottle.delete(`${userId}:${conversationId}`);
          }
          stampedConversations.clear();
          for (const [conversationId, claimId] of [...claimByConversation.entries()]) {
            const key = `${userId}:${conversationId}`;
            const activeUserId = userId;
            void enqueueTypingOp(key, async () => {
              const current = claimByConversation.get(conversationId) ?? claimId;
              if (claimByConversation.has(conversationId)) {
                claimByConversation.delete(conversationId);
              }
              if (await releaseTyping(key, current)) {
                try {
                  await conversations.setTyping(activeUserId, conversationId, false);
                } catch {
                  // Best-effort stop on disconnect.
                }
              }
            });
          }
        }
      });
    },
  );
};

export default routes;
