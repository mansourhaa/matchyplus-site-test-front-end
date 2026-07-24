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
    A[".env"] --> B[".env.development"] --> C[process.env]
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

### Authentication

| Variable              | Required           | Description                      |
| --------------------- | ------------------ | -------------------------------- |
| `ACCESS_TOKEN_SECRET` | Yes                | JWT signing secret               |
| `ACCESS_TOKEN_TTL`    | No                 | Token expiry (`1d`, `7d`, `12h`) |
| `COOKIE_SECRET`       | Yes (staging/prod) | Fastify cookie signing           |
| `REFRESH_TOKEN_SECRET` | Yes | Secret used to sign refresh tokens. Use a different long random value from `ACCESS_TOKEN_SECRET`. |
| `REFRESH_TOKEN_TTL_DAYS` | Yes | Number of days before a refresh token expires. |
| `VERIFICATION_CODE_SECRET` | Yes | HMAC key used to hash email-verification codes before they're stored — the plaintext code is never persisted. |

### Twilio Verify (phone OTP) — optional at startup

These variables are **optional**: the API starts normally without them. They're only
required for phone-OTP endpoints to actually work — without them, `POST /otp/send`,
`POST /otp/verify`, `POST /register-phone`, and the OTP-dependent parts of password
reset / phone linking all fail closed with `otp_service_not_configured` (503) instead
of attempting a call with missing credentials.

| Variable                    | Required | Description                                                         |
| --------------------------- | -------- | ------------------------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`        | No (see above) | Your Twilio account SID from the Twilio Console                     |
| `TWILIO_AUTH_TOKEN`         | No (see above) | Your Twilio auth token from the Twilio Console                      |
| `TWILIO_VERIFY_SERVICE_SID` | No (see above) | The SID of the Verify service you create in Twilio for OTP delivery |

All three must be set together for phone OTP to work — Twilio Verify (not the plain
Messaging API) handles SMS delivery, so no separate sender phone number is configured
here.

Typical values:

- `TWILIO_ACCOUNT_SID` = the Account SID shown in the Twilio dashboard
- `TWILIO_AUTH_TOKEN` = the Auth Token shown in the Twilio dashboard
- `TWILIO_VERIFY_SERVICE_SID` = the Service SID of the Verify service used for SMS OTP

For local testing, use a Twilio trial account and make sure the destination phone number is verified in Twilio. The API uses these values in the phone OTP flow for sending and validating SMS codes.

### Email (SMTP) — optional

| Variable | Required | Description |
| --- | --- | --- |
| `SMTP_HOST` | No | SMTP server host |
| `SMTP_PORT` | No | SMTP server port (e.g. `587`, `465`) |
| `SMTP_USER` | No | SMTP auth username |
| `SMTP_PASS` | No | SMTP auth password |
| `SMTP_FROM` | No | `From` address for outgoing mail |
| `SMTP_FROM_NAME` | No | `From` display name (defaults to `APP_NAME`) |
| `SMTP_SECURE` | No | Force TLS (`true`/`false`); defaults to `true` only on port `465` |

> Email verification is optional infrastructure: if any of `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / a resolvable "from" address are missing, the server still boots normally — `POST /auth/email-verification/request` just fails at request time with `smtp_not_configured` (503) instead of the process refusing to start.

### Google & LinkedIn OAuth — optional, per provider

| Variable | Required | Description |
| --- | --- | --- |
| `API_BASE_URL` | No | This API's own absolute base URL, used to build the OAuth callback URL registered with each provider |
| `FRONTEND_URL` | No | SPA base URL; the OAuth callback redirects here with `?code=...` or `?error=...` |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `LINKEDIN_CLIENT_ID` | No | LinkedIn OAuth client id |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth client secret |
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
| `REDIS_URL` | Yes (for AI jobs) | Redis connection URL | — |
| `AI_STREAM_KEY` | No | Redis Streams key | `ai:jobs` |
| `AI_CONSUMER_GROUP` | No | Consumer group name | `ai-workers` |
| `AI_CACHE_TTL_SECONDS` | No | Cache TTL for EMBED/MATCH | `300` |
| `AI_SERVICE_PORT` | No | Flask health port | `5000` |
| `AI_ENABLE_WORKER` | No | Run worker thread in AI container | `true` |
| `AI_WORKER_CONCURRENCY` | No | Jobs claimed per loop | `1` |
| `AI_INTERNAL_TOKEN` | Staging/prod | Protects AI internal endpoints | — |
| `AI_DATABASE_URL` | Local compose | DB URL seen from AI container | `host.docker.internal` DSN |

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

Changing them invalidates Turbo build caches across workspaces.

---

## Security checklist

- [ ] Never commit `.env.development`, `.env.staging`, or `.env.production` with real secrets
- [ ] Use `openssl rand -base64 32` for `ACCESS_TOKEN_SECRET` and `COOKIE_SECRET`
- [ ] Use different secrets per environment
- [ ] Use separate databases per environment
- [ ] Store production secrets in Kubernetes Secrets via `deploy/scripts/bootstrap-secrets.sh`
