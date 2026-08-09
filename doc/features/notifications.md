# Notifications

Persistent in-app notification feed with optional realtime push and email delivery.

## Responsibility split

| Layer | Owns |
| --- | --- |
| `NotificationService` | Persist → push → fire-and-forget email; preferences; category gates |
| `NotificationEmailsService` / `EmailService` | SMTP delivery when `SMTP_*` is set and `notify_email` is on |
| Producers (`profiles`, `swipe`, `conversation`) | Build typed payloads and call create helpers |
| `apps/app` `features/notifications` | Feed list, preferences UI, Redux |
| Realtime bridge | Refetch feed / toast on `notification_*` events |

Do **not** put notifications on the AI Redis job queue. Chat still uses ephemeral `new_message` for the open thread; the inbox row is a separate `Notification` persist.

## Persist-then-push

1. Insert a `Notification` row for the recipient.
2. Push `notification_<type>` (MATCH_REQUEST uses `notification_match`) with `notification_id` in the payload.
3. Queue email best-effort (never fails the triggering HTTP action).

Offline recipients still see the row on next `GET /notifications`.

## Types

Prisma `NotificationType`: `PROFILE_VIEW` | `MATCH` | `MATCH_REQUEST` | `MESSAGE`.

| Type | Push event | Preference category | Email kind |
| --- | --- | --- | --- |
| `PROFILE_VIEW` | `notification_profile_view` | `views` | `profile_view` |
| `MATCH` | `notification_match` | `matches` | `match` |
| `MATCH_REQUEST` | `notification_match` | `matches` | `match_request` |
| `MESSAGE` | `notification_message` | `messages` | `message` |

Match payloads include `event_type: 'match' | 'match_request'` for client compatibility. Message payloads include `conversation_id`, `sender_id`, `sender_name`, `sender_image`, `preview`.

## Preferences

User columns: `notify_all`, `notify_matches`, `notify_messages`, `notify_views`, `notify_email`.

Wire shape (snake_case): `{ all_enabled, matches, messages, views, email }`.

In-app delivery requires **master + category**. Email only checks `notify_email` (and SMTP).
When views are muted, profile-view emails still respect the same viewer cooldown via a
silent (non-inbox) marker row. Inbox list/unread filters drop `data.silent === true` in
application code — Prisma’s `NOT path equals true` JSON filter incorrectly excludes rows
where `silent` is absent (SQL NULL), which emptied the feed.

Mutual match always pushes ephemeral `notification_match` even when prefs suppress the inbox row, so clients can sync match state.

## Endpoints

Prefix: `/api/v1/notifications` (JWT required)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | List (50) + `unread_count` |
| GET | `/preferences` | Current toggles |
| PUT | `/preferences` | Partial update |
| POST | `/:id/read` | Mark one read |
| POST | `/read-all` | Mark all read |

## Producers

- **Profile view** — `POST /profiles/:id/view` → `createProfileViewIfEnabled` (cooldown dedupe).
- **Swipe** — right swipe → `MATCH_REQUEST` via `createIfEnabled`; new mutual match → retract outstanding `MATCH_REQUEST`s between the pair (pushes `notifications_updated`), then `deliverMatchNotification` (persist if enabled, else ephemeral push). Withdraw or RIGHT→LEFT flip retracts the peer's `MATCH_REQUEST` and pushes `notifications_updated`.
- **Conversation** — after send: `new_message` to both peers (ephemeral chat); `MESSAGE` inbox via `createIfEnabled` for the peer.

## Frontend

- `/notifications` — preferences toggles + typed feed; click navigates (`/matches`, `/chat/:id`, profile view marks read only).
- Discover bell badge uses `selectNotifications.unreadCount`.
- Realtime: any `notification_match` refetches feed + toast (match / match_request; suppressed on `/notifications`); `event_type === 'match'` also refreshes match/inbox; `notification_message` refetches + toast (toast suppressed when pathname is `/chat/:conversation_id` or `/notifications`); `notifications_updated` refetches feed only; `notification_profile_view` refetches + toast (suppressed on `/notifications`).

## Email / SMTP

Optional. See [environment variables](../setup/environment-variables.md) (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, …). Action links use `APP_URL` / `FRONTEND_URL` / `PUBLIC_APP_URL` → `/matches`, `/notifications`, `/discover`.
