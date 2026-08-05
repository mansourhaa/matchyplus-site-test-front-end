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
| GET | `/ip-geolocation` | Approximate lat/lon (+ city/region/country) from client IP or optional `?ip=` |
| GET | `/reverse-geocode` | Address label from `?lat=&lon=` |

Both responses set `Cache-Control: private, no-store` and use a stricter per-route rate limit (`GEOLOCATION_RATE_LIMIT`).

### IP selection

1. Non-empty trimmed `?ip=` when it is a valid IPv4/IPv6 literal
2. Else `request.ip` (honors `X-Forwarded-For` **only** when `TRUST_PROXY=true`)
3. Empty `?ip=` falls through to the client IP
4. If no usable client IP can be parsed → `200` with `success: false` / `Unable to determine client IP` and **no** upstream calls (avoids geolocating the API egress address)

Invalid `?ip=` → `400` / `invalid_ip`.

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
```

## Out of scope

Dynamic GPS upsert / sharing / nearby users (`UserLocation` CRUD) — owned by the location-sharing / nearby-users migrations. This module only provides the IP / reverse-geocode **proxies** that matching uses when browser GPS is unavailable.
