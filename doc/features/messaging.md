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

- Match (existing): `notification_match`, `match_removed`
- Messaging: `new_message`, `notification_message`, `messages_read`, `user_typing`, `user_stop_typing`, `message_like_changed`, `conversation_status_changed`, `conversation_block_status_changed`

Clients may send `{ event: "typing"|"stop_typing", payload: { conversation_id } }` on the same socket.
Clients may also send `{ event: "ping" }` for keepalive; the server replies `{ event: "pong" }`.

When `REDIS_URL` is set, `notifyUser` delivers to local sockets and `XADD`s to Redis Streams
(`REALTIME_STREAM_KEY`, default `realtime:events`) with approximate `MINID ~` retention
(30 minutes). Each API instance consumes with its own consumer group
(`realtime:inst:{INSTANCE_ID}`) from the start of the retained stream (`0`) so late
bootstrap still catches peer publishes within the retention window; entries older than
process start are skipped so clients do not get historical replay. Idle pending entries
are reclaimed via `XAUTOCLAIM` so a failed deliver/ACK or crash does not permanently
miss events. Catch-up uses `max(publisher ts, stream id ms)` so publisher clock skew
cannot drop live peer events.
Events include `originInstanceId` so the publishing instance does not double-deliver.

**`INSTANCE_ID` is required whenever Redis fan-out is enabled** and must be unique per
replica (e.g. Kubernetes pod name via Downward API). Reusing the same value across pods
makes them share one consumer group; Redis then load-balances entries and peers on other
pods miss events. A random UUID every boot is not allowed with Redis — after restart,
retained self-publishes would no longer match `originInstanceId` and could replay to
reconnecting clients.
Without Redis, fan-out stays in-process (single instance). HTTP write responses remain
authoritative for the acting user.

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
