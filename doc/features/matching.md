# Matching & Discovery (product API)

Scripted Discovery v5 + mutual-like matching in Fastify.
Source migration notes: [MATCHING_FEATURE.md](../../../.doc/MATCHING_FEATURE.md) (legacy Matchy-FullStack).

## Responsibility split

| Layer | Owns |
| --- | --- |
| `apps/api` DiscoveryService / SwipeService | Feed eligibility, scripted score, swipe, quota, match creation, withdraw, unmatch |
| `apps/api` `utils/matching-score.ts` | Pure scoring (no I/O, no Ollama) |
| `apps/ai` `MATCH` / `EMBED` processors | Future semantic retrieval / rerank via `AiJob` — **not** swipe state |
| `apps/app` | UI consuming these REST + realtime endpoints |

Do **not** port legacy `aiMatchingService`, unmounted `/api/matching/*`, Ollama feed calls, or browser `AIMatchingEngine`.

## Data model

Prisma models in `packages/database/prisma/schema.prisma`:

- `Swipe` — live state per pair (`LEFT` \| `RIGHT` \| `WITHDRAWN`)
- `SwipeLog` — append-only; **RIGHT** rows in the UTC day drive quota
- `Match` — mutual RIGHT; presence = active (no status column); ordered `user_low_id` / `user_high_id`
- `UserLocation` — dynamic GPS preferred over `User.gps_*` for discovery radius
- `UserBlock` — bidirectional exclusion from feed and swipes

### Ownership notes for overlapping schema

- `UserLocation` and `UserBlock` are **matching dependencies** in this migration so discovery radius and block checks work.
- The location-sharing feature may extend `UserLocation` with update/delete/settings UX; merge order into `dev` must treat this matching migration as the schema source of truth for the table creation.
- `UserBlock` is matching-owned for feed/swipe exclusion. Other features should reuse it rather than create a second block table.

### Backlog fixes baked in

1. **Withdraw** logs `WITHDRAWN`, not `LEFT` — feed excludes only `LEFT`/`RIGHT` logs.
2. **Quota** always re-counted from `SwipeLog` after writes (no in-memory `used += 1`).
3. **Match notify** fans out to **both** users via `fastify.notifyUser` (+ HTTP `match` for the acting swiper).
4. **No Ollama** on the feed path.
5. **Interest score** uses Jaccard (overlap/union).
6. **Reciprocity** boost when the candidate already liked you.
7. Cross-sector under sector-strict intents → low-priority **suggestion** group, not hard drop.
8. Quota reset labeled `midnight_utc` deliberately.

## Match → conversation

Legacy Matchy created a conversation row on reciprocal match.

In this codebase, **conversation / messaging is a separate feature** (see [messaging.md](./messaging.md)). Matching:

- creates the `Match` row
- calls `ConversationService.ensureForMatch` (messaging-owned)
- notifies both users (`notification_match` includes `conversation_id`)
- exposes `conversation_id` on `/swipe/matches`
- on unmatch, calls `ConversationService.detachOnUnmatch` before deleting the Match (history kept)

Matching must not own messaging schema or inbox lifecycle beyond these thin hooks.

## Endpoints (JWT required)

Prefix: `/api/v1`

| Method | Path | Service |
| --- | --- | --- |
| GET | `/discovery/swipe-feed` | Ranked deck |
| GET | `/discovery/quota` | Quota snapshot |
| POST | `/discovery/swipe` | Like / pass |
| POST | `/swipe` | Like / pass (alias) |
| GET | `/swipe/matches` | Mutual matches |
| GET | `/swipe/pending` | Outgoing one-way likes |
| DELETE | `/swipe/pending/:userId` | Withdraw (non-permanent) |
| GET | `/swipe/stats` | Aggregates + quota |
| GET | `/swipe/who-liked-me` | Incoming likes (premium+) |
| POST | `/swipe/unmatch/:userId` | Unmatch + clear pair logs/swipes |
| GET | `/realtime` (WebSocket) | `notification_match`, `match_removed`, messaging events (see messaging.md) |
| GET | `/location/ip-geolocation` | Approximate GPS via IP (fallback when browser geolocation is blocked) — see [location.md](./location.md) |
| GET | `/location/reverse-geocode` | Address label from coordinates — see [location.md](./location.md) |

### POST swipe body

```json
{ "target_user_id": "<cuid>", "direction": "right" }
```

Identities are **User ids** (cuid), not legacy integer profile ids.

### Realtime client

- Browser connects to `/api/v1/realtime?access_token=<token>` because WebSocket cannot set `Authorization`
- Server promotes the query token to Bearer before `verifyToken`
- App bridge: `features/matching/hooks/use-matching-realtime.ts` refreshes match/pending state on `notification_match` (`event_type: match`) and `match_removed`
- Client sends periodic `{ event: "ping" }` keepalive; server replies `pong`
- Multi-instance: `notifyUser` fans out over Redis Streams (`realtime:events`) when `REDIS_URL` is set — see [messaging.md](./messaging.md)

## Directory map

```text
apps/api/src/
  constants.ts                  # DISCOVERY_RADIUS_M, DISCOVERY_PAGE_SIZE, …
  utils/matching-score.ts       # pure scorer
  utils/discovery-feed.ts       # feed select + coord/score profile helpers
  utils/match-pair.ts
  utils/utc-day.ts
  services/discovery.ts         # DiscoveryService class
  services/swipe.ts             # SwipeService class
  services/swipe-quota.ts       # SwipeQuotaService class
  services/geolocation.ts       # IP / reverse-geocode HTTPS proxies
  plugins/user-realtime.ts
  services/realtime-fanout.ts
  constants/realtime.ts
  routes/v1/discovery/
  routes/v1/swipe/
  routes/v1/realtime/
  routes/v1/location/           # IP geolocation + reverse geocode (JWT)
  schemas/v1/matching.ts
  schemas/v1/location.ts
  types/matching.ts
  types/geolocation.ts

apps/app/src/
  features/matching/store/matching-slice.ts
  features/matching/hooks/use-matching-realtime.ts
  features/matching/components/matching-realtime-bridge.tsx
  components/matching/
```

## AI MATCH later

When pgvector + EMBED are live, Discovery may enqueue a `MATCH` `AiJob` for rerank. Product swipe/match/quota remain Fastify-owned.

## Frontend (`apps/app`)

| Piece | Path |
| --- | --- |
| Redux slice | `features/matching/store/matching-slice.ts` |
| Realtime bridge | `features/matching/components/matching-realtime-bridge.tsx` |
| i18n (en/fr/ar) | `features/i18n/` |
| Discover UI | `components/matching/discover-view.tsx` → `/discover` |
| Matches UI | `components/matching/matches-view.tsx` → `/matches` |

Auth for matching REST currently follows the app client (`lib/api.ts`). Session-model migration is owned by the auth team and is out of scope for matching feature fixes.
