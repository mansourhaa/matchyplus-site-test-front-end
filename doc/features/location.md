# Location proxies (IP geolocation & reverse geocode)

Server-side proxies for approximate location used as a **GPS fallback** for discovery matching.
Migrated from Matchy-FullStack `GET /api/location/ip-geolocation` and `GET /api/location/reverse-geocode`.

## Why a proxy

- Browser CORS and production `Permissions-Policy` often block direct calls to IP/geo providers.
- Upstream fan-out + timeouts must stay off the client.
- The app must never talk to Flask/AI for this; Fastify only.

## Endpoints (JWT required)

Prefix: `/api/v1/location`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/ip-geolocation` | Approximate lat/lon (+ city/region/country) from the authenticated client IP |
| GET | `/reverse-geocode` | Address label from `?lat=&lon=` |

Both responses set `Cache-Control: private, no-store` and use a stricter per-route rate limit (`GEOLOCATION_RATE_LIMIT`).

### IP selection

1. `request.ip` only (honors `X-Forwarded-For` **only** when `TRUST_PROXY=true`)
2. If no usable client IP can be parsed → `200` with `success: false` / `Unable to determine client IP` and **no** upstream calls (avoids geolocating the API egress address)

### Providers (HTTPS only)

IP geolocation failover: `ipwho.is` → `ipapi.co` → `freeipapi.com`.

Reverse geocode failover: Nominatim → BigDataCloud.

Cleartext HTTP providers (e.g. free `ip-api.com`) are **not** used.

Coordinate parsing uses null checks (`== null` / `Number.isFinite`) so latitude/longitude `0` is valid.

## Directory map

```text
apps/api/src/
  services/geolocation.ts
  services/geolocation.test.ts
  routes/v1/location/actions.ts
  routes/v1/location/autohooks.ts
  schemas/v1/location.ts
  types/geolocation.ts
  utils/ip.ts
  utils/geo-coords.ts
  test/location-actions.test.ts

apps/app/src/
  features/location/location-context.tsx  # GPS first, then /location/ip-geolocation fallback
```

## Out of scope

Dynamic GPS upsert / sharing / nearby users (`UserLocation` CRUD) — owned by the location-sharing / nearby-users migrations. This module only provides the IP / reverse-geocode **proxies** that matching uses when browser GPS is unavailable.
