# Matching & Discovery (product API)

Scripted Discovery v5 + mutual-like matching in Fastify.  
Source migration notes: [MATCHING_FEATURE.md](../../../.doc/MATCHING_FEATURE.md) (legacy Matchy-FullStack).

## Responsibility split

| Layer | Owns |
| --- | --- |
| `apps/api` DiscoveryService / SwipeService | Feed eligibility, scripted score, swipe, quota, match creation, withdraw, unmatch |
| `apps/api` `utils/matching-score.ts` | Pure scoring (no I/O, no Ollama) |
| `apps/ai` `MATCH` / `EMBED` processors | Future semantic retrieval / rerank via `AiJob` — **not** swipe state |
| `apps/app` | UI consuming these REST + realtime endpoints (wire-up follow-up) |

Do **not** port legacy `aiMatchingService`, unmounted `/api/matching/*`, Ollama feed calls, or browser `AIMatchingEngine`.

## Data model

Prisma models in `packages/database/prisma/schema.prisma`:

- `Swipe` — live state per pair (`LEFT` \| `RIGHT` \| `WITHDRAWN`)
- `SwipeLog` — append-only; **RIGHT** rows in the UTC day drive quota
- `Match` — mutual RIGHT; presence = active (no status column); ordered `user_low_id` / `user_high_id`
- `UserLocation` — dynamic GPS preferred over `User.gps_*`
- `UserBlock` — bidirectional exclusion

### Backlog fixes baked in

1. **Withdraw** logs `WITHDRAWN`, not `LEFT` — feed excludes only `LEFT`/`RIGHT` logs.
2. **Quota** always re-counted from `SwipeLog` after writes (no in-memory `used += 1`).
3. **Match notify** fans out to **both** users via `fastify.notifyUser` (+ HTTP `match` for the acting swiper).
4. **No Ollama** on the feed path.
5. **Interest score** uses Jaccard (overlap/union).
6. **Reciprocity** boost when the candidate already liked you.
7. Cross-sector under sector-strict intents → low-priority **suggestion** group, not hard drop.
8. Quota reset labeled `midnight_utc` deliberately.

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
| GET | `/realtime` (WebSocket) | `notification_match`, `match_removed` |

### POST swipe body

```json
{ "target_user_id": "<cuid>", "direction": "right" }
```

Identities are **User ids** (cuid), not legacy integer profile ids.

## Directory map

```text
apps/api/src/
  utils/matching-score.ts     # pure scorer
  utils/match-pair.ts
  utils/utc-day.ts
  services/discovery.ts
  services/swipe.ts
  services/swipe-quota.ts
  plugins/user-realtime.ts
  routes/v1/discovery/
  routes/v1/swipe/
  routes/v1/realtime/
  schemas/v1/matching.ts
  types/matching.ts
```

## AI MATCH later

When pgvector + EMBED are live, Discovery may enqueue a `MATCH` `AiJob` for rerank. Product swipe/match/quota remain Fastify-owned.

## Frontend (`apps/app`)

| Piece | Path |
| --- | --- |
| Redux slice | `features/matching/store/matching-slice.ts` |
| i18n (en/fr/ar) | `features/i18n/` |
| Discover UI | `components/matching/discover-view.tsx` → `/discover` |
| Matches UI | `components/matching/matches-view.tsx` → `/matches` |

Auth: `lib/api.ts` attaches `Authorization: Bearer` from `sessionStorage`. Errors are stored as message keys and rendered via `t(...)`.
