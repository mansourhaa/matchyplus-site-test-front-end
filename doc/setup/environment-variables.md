# Environment Variables

Environment files live at the **monorepo root** and are loaded via `dotenv-cli` in workspace scripts.

**Repository:** [github.com/matchy-plus/matchy-plus](https://github.com/matchy-plus/matchy-plus)

> Read [Environments & NODE_ENV](./environments-and-node-env.md) for how to choose the right env file and what `NODE_ENV` controls.

## File layout

```mermaid
flowchart TB
    subgraph Committed["Committed templates"]
        EX[".env.example"]
        EXS[".env.staging.example"]
        EXP[".env.production.example"]
    end

    subgraph Local["Local runtime gitignored"]
        ED[".env.development"]
        ES[".env.staging"]
        EP[".env.production"]
        EL[".env.local"]
    end

    EX -->|cp| ED
    EXS -->|cp| ES
    EXP -->|cp| EP
    EL -.->|overrides| ED
```

| File                      | Purpose              | Committed?      |
| ------------------------- | -------------------- | --------------- |
| `.env.example`            | Development template | Yes             |
| `.env.staging.example`    | Staging template     | Yes             |
| `.env.production.example` | Production template  | Yes             |
| `.env.development`        | Local development    | No (gitignored) |
| `.env.staging`            | Staging runtime      | No (gitignored) |
| `.env.production`         | Production runtime   | No (gitignored) |
| `.env.local`              | Local overrides      | No (gitignored) |

### Create env files

```bash
cp .env.example .env.development
cp .env.staging.example .env.staging
cp .env.production.example .env.production
```

### Load order (root `pnpm dev`)

```mermaid
flowchart LR
    ED[".env.development"] --> C[process.env]
```

---

## Variable reference

### Core

| Variable       | Required | Description                               | Example                                    |
| -------------- | -------- | ----------------------------------------- | ------------------------------------------ |
| `NODE_ENV`     | Yes      | `development`, `staging`, or `production` | `development`                              |
| `DATABASE_URL` | Yes      | PostgreSQL connection string              | `postgresql://user:pass@localhost:5432/db` |

### API server

| Variable                    | Required | Description                  | Default     |
| --------------------------- | -------- | ---------------------------- | ----------- |
| `SERVER_PORT`               | No       | Fastify listen port          | `8000`      |
| `SERVER_HOST`               | No       | Fastify bind address         | `localhost` |
| `FASTIFY_CLOSE_GRACE_DELAY` | No       | Graceful shutdown delay (ms) | `500`       |

### Location proxies (IP geolocation / reverse geocode)

| Variable                     | Required | Description                                                                 | Default                                   |
| ---------------------------- | -------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| `TRUST_PROXY`                | No       | Set `true`/`1` behind Nginx Ingress so `X-Forwarded-For` is trusted for `request.ip` | unset (false)                      |
| `IP_GEOLOCATION_TIMEOUT_MS`  | No       | Per-provider timeout for IP geolocation                                     | `5000`                                    |
| `REVERSE_GEOCODE_TIMEOUT_MS` | No       | Per-provider timeout for reverse geocode                                    | `8000`                                    |
| `NOMINATIM_USER_AGENT`       | No       | User-Agent sent to OpenStreetMap Nominatim                                  | `MatchyPlus/1.0 (contact@matchyplus.com)` |

Staging/production API pods behind Ingress **must** set `TRUST_PROXY=true`. Leave unset for local direct access so clients cannot spoof IPs via `X-Forwarded-For`.

See [location.md](../features/location.md).

### Authentication

| Variable              | Required           | Description                      |
| --------------------- | ------------------ | -------------------------------- |
| `ACCESS_TOKEN_SECRET` | Yes                | JWT signing secret               |
| `ACCESS_TOKEN_TTL`    | No                 | Token expiry (`1d`, `7d`, `12h`) |
| `COOKIE_SECRET`       | Yes (staging/prod) | Fastify cookie signing           |
| `REFRESH_TOKEN_SECRET` | Yes | Secret used to sign refresh tokens. Use a different long random value from `ACCESS_TOKEN_SECRET`. |
| `REFRESH_TOKEN_TTL_DAYS` | Yes | Number of days before a member refresh token expires. |
| `ADMIN_REFRESH_TOKEN_TTL` | Yes | Duration (`12h`, `1d`, …) before an admin refresh token expires — much shorter than the member TTL on purpose, so a stolen admin session can't stay silently renewable for weeks. |
| `VERIFICATION_CODE_SECRET` | Yes | HMAC key used to hash phone OTP codes before they're stored — the plaintext code is never persisted. |

### Rate Limiting

| Variable | Required | Description | Default |
| -------- | -------- | ----------- | ------- |
| `RATE_LIMIT_GLOBAL_MAX` | No | Global max requests per time window | `100` |
| `RATE_LIMIT_GLOBAL_WINDOW` | No | Global rate limit time window | `1 minute` |

### TunisieSMS (phone OTP delivery) — optional at startup

This app owns the entire OTP lifecycle itself (generation, hashing, expiry, attempts —
see `apps/api/src/services/otp-challenge.ts`); TunisieSMS only delivers the text
message. `TUNISIESMS_KEY` is **optional**: the API starts normally without it. It's
only required for phone-OTP endpoints to actually send anything — without it,
`POST /otp/send` and the OTP-sending parts of password reset / phone linking fail
closed with `sms_service_not_configured` (503) instead of attempting a call with no key.

| Variable            | Required       | Description                                                    |
| -------------------- | -------------- | ---------------------------------------------------------------- |
| `TUNISIESMS_KEY`     | No (see above) | API key from your TunisieSMS account                              |
| `TUNISIESMS_SENDER`  | No             | Sender name shown on the SMS, truncated to 11 chars (default `Matchy plus`) |

Optional OTP lifecycle tuning — all have sensible defaults if left unset:

| Variable                        | Default | Description                                              |
| -------------------------------- | ------- | ---------------------------------------------------------- |
| `OTP_TTL_MINUTES`                | `10`    | How long a sent code stays valid                          |
| `OTP_MAX_ATTEMPTS`               | `5`     | Wrong-code attempts allowed before a challenge is dead     |
| `OTP_RESEND_COOLDOWN_SECONDS`    | `60`    | Minimum time between two codes for the same phone+purpose  |
| `OTP_SIGNUP_GRANT_TTL_MINUTES`   | `15`    | How long a signup-verification grant stays valid before `register-phone` must consume it |

### Google & LinkedIn OAuth — optional, per provider

| Variable | Required | Description |
| --- | --- | --- |
| `API_BASE_URL` | No | This API's own absolute base URL (used to derive default OAuth callback URLs) |
| `FRONTEND_URL` | No | SPA base URL; the OAuth callback redirects here with `?code=...` or `?error=...` |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | Must match an Authorized redirect URI on the Google client and the v1 handler. Default: `${API_BASE_URL}/api/v1/auth/oauth/google/callback` |
| `LINKEDIN_CLIENT_ID` | No | LinkedIn OAuth client id |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth client secret |
| `LINKEDIN_REDIRECT_URI` | No | Same rules as Google; default `${API_BASE_URL}/api/v1/auth/oauth/linkedin/callback` |
| `OAUTH_EXCHANGE_CODE_TTL_SECONDS` | No | How long a one-time exchange code stays valid (default `60`) |

> Google and LinkedIn are independent and both optional: each is only registered when its own client id **and** secret are both set. A missing pair disables just that provider's `/api/v1/auth/oauth/<provider>` route — it does not stop the API from starting, and the other provider is unaffected.

### Frontend (Next.js)

| Variable              | Required | Description                            |
| --------------------- | -------- | -------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Yes      | Public API base URL (inlined at build) |

> Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets in them.

### Option C — AI queue / cache / worker

| Variable | Required | Description | Default |
| --- | --- | --- | --- |
| `REDIS_URL` | Yes (for AI jobs / multi-instance realtime) | Redis connection URL | — |
| `AI_STREAM_KEY` | No | Redis Streams key for AI jobs | `ai:jobs` |
| `AI_CONSUMER_GROUP` | No | Consumer group name | `ai-workers` |
| `AI_CACHE_TTL_SECONDS` | No | Cache TTL for EMBED/MATCH | `300` |
| `AI_SERVICE_PORT` | No | Flask health port | `5000` |
| `AI_ENABLE_WORKER` | No | Run worker thread in AI container | `true` |
| `AI_WORKER_CONCURRENCY` | No | Jobs claimed per loop | `1` |
| `AI_INTERNAL_TOKEN` | Staging/prod | Protects AI internal endpoints | — |
| `AI_DATABASE_URL` | Local compose | DB URL seen from AI container | `host.docker.internal` DSN |
| `REALTIME_STREAM_KEY` | No | Redis Streams key for WebSocket fan-out | `realtime:events` |
| `INSTANCE_ID` | **Required when `REDIS_URL` is set**; unique per replica and **stable across restarts** | Consumer group suffix (`realtime:inst:{id}`). Prefer StatefulSet pod name (K8s Downward API, e.g. `saas-api-0`). Reusing across pods breaks fan-out; changing on restart can replay self-origin events. Random UUID is only allowed without Redis. | — (throws if Redis on and unset) |

### Notification email (optional SMTP)

When unset, in-app notifications still work; email delivery is skipped. See [Notifications](../features/notifications.md).

| Variable | Required | Description | Default |
| --- | --- | --- | --- |
| `SMTP_HOST` | No | SMTP server hostname | — (disabled) |
| `SMTP_PORT` | No | SMTP port | `587` |
| `SMTP_USER` | No | SMTP auth user | — |
| `SMTP_PASS` | No | SMTP auth password | — |
| `SMTP_FROM` | No | From address (`Name <addr>` ok) | falls back to user |
| `SMTP_SECURE` | No | Force TLS (`true`/`false`); else port 465 → secure | — |
| `SMTP_FROM_NAME` | No | Display name when building From | `APP_NAME` / Matchy+ |
| `SMTP_LOGO_PATH` | No | Optional logo file for HTML emails | — |
| `APP_URL` / `FRONTEND_URL` / `PUBLIC_APP_URL` | No | Base URL for email action links (first set wins) | `http://localhost:3000` |

Local Redis/AI: `pnpm infra:up` (`compose.dev.yaml`).  
Staging/prod: Kubernetes Services `saas-redis` + `saas-ai` (see [AI Async Jobs](../features/ai-async-jobs.md)).

---

## Per-environment values

### Development (`.env.development`)

```env
NODE_ENV=development
SERVER_PORT=8000
SERVER_HOST=localhost
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saas_db?schema=public
ACCESS_TOKEN_SECRET=dev-access-token-secret
ACCESS_TOKEN_TTL=1d
COOKIE_SECRET=dev-cookie-secret
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
REDIS_URL=redis://localhost:6379/0
AI_STREAM_KEY=ai:jobs
AI_CONSUMER_GROUP=ai-workers
REALTIME_STREAM_KEY=realtime:events
# Required when REDIS_URL is set; must be unique per replica and stable across restarts (e.g. StatefulSet pod name).
INSTANCE_ID=api-local
```

### Staging (`.env.staging`)

Copy from `.env.staging.example` (includes in-cluster `REDIS_URL`).

### Production (`.env.production`)

Copy from `.env.production.example`. Prefer a managed Redis URL in production when you need HA.

---

## Turbo cache invalidation

These variables are declared in `turbo.json` under `globalEnv`:

- `NODE_ENV`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `REDIS_URL`
- `AI_STREAM_KEY`
- `AI_CONSUMER_GROUP`
- `AI_CACHE_TTL_SECONDS`
- `REALTIME_STREAM_KEY`
- `INSTANCE_ID`

Changing them invalidates Turbo build caches across workspaces.

---

## Security checklist

- [ ] Never commit `.env.development`, `.env.staging`, or `.env.production` with real secrets
- [ ] Use `openssl rand -base64 32` for `ACCESS_TOKEN_SECRET` and `COOKIE_SECRET`
- [ ] Use different secrets per environment
- [ ] Use separate databases per environment
- [ ] Store production secrets in Kubernetes Secrets via `deploy/scripts/bootstrap-secrets.sh`
