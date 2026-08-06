# Messaging & Conversations (product API)

Match-gated 1:1 DMs in Fastify, owned by the messaging feature.
Source migration notes: Matchy-FullStack `/api/messages` + Socket.io (replaced by this REST + in-process WebSocket design).

## Responsibility split

| Layer | Owns |
| --- | --- |
| `apps/api` ConversationService / MessageQuotaService | Threads, messages, likes, voice upload ACL, daily quota, match lifecycle hooks |
| `apps/api` SwipeService | Thin hooks only: `ensureForMatch` on mutual match, `detachOnUnmatch` before Match delete |
| `apps/api` UserBlock (matching-owned) | Block exclusion reused on send/typing — no second block table |
| `apps/app` `features/messaging` | Inbox, chat thread, Redux, realtime handlers |

Do **not** put Conversation/Message schema ownership inside matching services.

## Data model

Prisma models in `packages/database/prisma/schema.prisma`:

- `Conversation` — ordered `user_low_id` / `user_high_id` unique pair; optional `match_id` (unique, `onDelete: SetNull`)
- `Message` — `TEXT` \| `VOICE`, `media_url`, `is_read`
- `MessageLike` — unique `(message_id, user_id)`

### Unmatch / block policy (legacy keep-history)

- Unmatch sets `Conversation.match_id = NULL` and keeps messages; composer stays read-only until rematch reattaches `match_id`.
- Block (either direction via `UserBlock`) blocks send; history remains readable for participants.

## Endpoints (JWT required)

Prefix: `/api/v1`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/conversations` | Inbox |
| GET | `/conversations/quota` | `messages_per_day` snapshot |
| GET | `/conversations/:id` | Thread metadata + `can_send` |
| GET | `/conversations/:id/messages` | Cursor-paginated history (auto mark-read) |
| POST | `/conversations/:id/messages` | Send text/voice |
| POST | `/conversations/:id/read` | Mark read |
| POST | `/conversations/:id/typing` | Typing fan-out |
| POST | `/conversations/:id/messages/:messageId/like` | Toggle like |
| POST | `/conversations/upload-audio` | Voice upload → `/uploads/audio/...` |
| GET | `/conversations/audio/:filename` | Participant-only audio stream |

## Realtime events

Via `/realtime` WebSocket (`fastify.notifyUser`):

- Match (existing): `notification_match` (payload may be inbox-backed with `notification_id`, or ephemeral when prefs suppress), `match_removed`
- Notifications inbox: `notification_profile_view`, `notification_message` (see [notifications.md](./notifications.md))
- Messaging: `new_message` (ephemeral chat channel — dual with inbox `MESSAGE` rows), `messages_read`, `user_typing`, `user_stop_typing`, `message_like_changed`, `conversation_status_changed`, `conversation_block_status_changed`

Clients may send `{ event: "typing"|"stop_typing", payload: { conversation_id } }` on the same socket.
Clients may also send `{ event: "ping" }` for keepalive; the server replies `{ event: "pong" }`.

When `REDIS_URL` is set, `notifyUser` delivers to local sockets and best-effort `XADD`s
to Redis Streams (`REALTIME_STREAM_KEY`, default `realtime:events`) with approximate
`MINID ~` retention (30 minutes). Transient publish failures are retried a few times;
if they still fail the error is logged only — local delivery already happened and HTTP
write responses remain authoritative for the acting user. Each API instance consumes
with its own consumer group (`realtime:inst:{INSTANCE_ID}`) from the start of the
retained stream (`0`) so late bootstrap still catches peer publishes within the
retention window. Catch-up cutoff maps process start onto Redis `TIME` (minus grace)
so a consumer clock ahead of Redis cannot drop live peer entries, while a long
bootstrap retry cannot advance the cutoff past peer events published while this
instance was still ensuring the consumer group. Event age prefers the Redis stream
id millisecond prefix (not publisher ISO `ts`) so a future `ts` cannot replay stale
retained rows and a lagging `ts` cannot hide live rows. Idle pending entries are
reclaimed via `XAUTOCLAIM` so a failed deliver/ACK or crash does not permanently
miss events. Delivered stream entry ids are **claimed in Redis before** the local
WebSocket push (`realtime:fanout:delivered:{INSTANCE_ID}`), so a crash between push
and `XACK` cannot re-push the same peer event on reclaim (at-most-once for that
entry on this replica). If the local push itself throws, the claim is cleared so
reclaim can retry. Events include `originInstanceId` so the publishing instance does
not double-deliver while that id is unchanged. Published stream entry ids are also
remembered in Redis (`realtime:fanout:published:{INSTANCE_ID}`) for the retention
window so a consumer-group recreate with the same id cannot replay this replica’s
own retained rows.

**`INSTANCE_ID` is required whenever Redis fan-out is enabled.** It must be unique per
replica **and stable across restarts** (Kubernetes StatefulSet pod name via Downward
API, e.g. `saas-api-0`). Reusing the same value across pods makes them share one
consumer group; Redis then load-balances entries and peers on other pods miss events.
A random UUID every boot is not allowed with Redis. Deployment pod names that change on
restart are not suitable — they create a new consumer group and can replay self-origin
events within the catch-up window.

WebSocket `close` / `stop_typing` enqueues stop only when no other claim remains for
that user/conversation. Claims are per-socket (Redis SET + per-claim key with TTL when
Redis is on, else an in-process Set) so multi-tab — including tabs on different API
replicas — does not clear the peer indicator while another tab is still typing, and a
TTL expiry on one claim cannot undercount the others. A shared per-user+conversation
throttle may drop duplicate `typing` fan-outs, but a new socket still acquires its own
claim on a throttled frame so it remains a holder.

After a successful stream `XADD`, published-entry memory is best-effort (retry `SADD`
only). A remember failure never re-publishes the same logical event to the stream.

Without Redis, fan-out stays in-process (single instance).

## Chat URL

`/chat/[conversationId]`. Matches list includes `conversation_id` from `/swipe/matches`
(backfilled via `ensureForMatch` for older matches). The UI never opens chat by `match_id`.

## Authz notes

- Missing conversation and non-participant both return **404** (no enumeration via 403).
- `blocked_me` / `i_blocked` are returned to participants so the composer can explain
  read-only state; they are not exposed to non-participants.

## Voice ownership

Upload writes `/uploads/audio/{userId}_{uuid}.ext`. Send rejects any `media_url` that is
not owned by the caller, missing on disk, or already attached to a message.

## Quota

`Plan.messages_per_day` (`-1` = unlimited). Count + create run in one **Serializable**
transaction so concurrent sends cannot exceed the daily limit.
