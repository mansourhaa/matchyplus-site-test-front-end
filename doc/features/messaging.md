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

In-process only today — multi-instance needs Redis pub/sub later. HTTP write responses remain authoritative for the acting user.

## Chat URL

`/chat/[conversationId]`. Matches list includes `conversation_id` from `/swipe/matches`.

## Quota

`Plan.messages_per_day` (`-1` = unlimited), counted from `Message` rows in the current UTC day (same pattern as swipe quota).
