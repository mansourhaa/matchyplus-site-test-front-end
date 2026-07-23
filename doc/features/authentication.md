# Authentication

End-to-end authentication flow between the Next.js frontend and Fastify API.

## Overview

```mermaid
sequenceDiagram
    actor User
    participant App as Next.js App
    participant Proxy as proxy.ts
    participant API as Fastify API
    participant DB as PostgreSQL

    User->>App: POST /login
    App->>API: POST /api/v1/auth/login
    API->>DB: Find user + verify bcrypt
    API-->>App: access_token + user
    App->>App: Redux + sessionStorage + cookie
    User->>App: Visit /projects
    App->>Proxy: Check cookie
    Proxy-->>App: Allow
    App->>API: GET /api/v1/auth/authcheck (Bearer JWT)
    API->>API: verifyToken
    API-->>App: user data
```

## Registration

**Frontend**: `apps/app/src/components/auth/register-form.tsx`

**API**: `POST /api/v1/auth/register`

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword"
}
```

Passwords are hashed with **bcrypt** before storage.

## Login

**Frontend**: `apps/app/src/components/auth/login-form.tsx`

**API**: `POST /api/v1/auth/login`

Response:

```json
{
  "access_token": "eyJhbG...",
  "user": {
    "id": "clx...",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### Client-side session storage

```mermaid
flowchart LR
    Login[Successful login] --> Redux[Redux accessToken]
    Login --> SS[sessionStorage]
    Login --> Cookie[access_token cookie]
    Cookie --> Proxy[proxy.ts route guard]
    Redux --> UI[Dashboard UI]
```

On successful login (`features/auth/store/auth-slice.ts`):

1. Token stored in **Redux** (`accessToken`)
2. Token stored in **sessionStorage** (`access_token`)
3. User stored in **sessionStorage** (`user`)
4. Token written to **cookie** (`access_token`) for route proxy

See `apps/app/src/lib/auth.ts`.

## Route protection (Next.js)

**File**: `apps/app/src/proxy.ts`

| Condition | Action |
| --- | --- |
| No cookie + protected route | Redirect to `/login` |
| Has cookie + auth route (`/login`, `/register`) | Redirect to `/` |
| Otherwise | Continue |

> This is an **optimistic cookie check** only — it does not verify JWT signatures. Real authorization happens on the API.

## API authorization

**Plugin**: `apps/api/src/plugins/authorization.ts`

Protected routes use `preHandler: [fastify.verifyToken]`:

1. Extract `Authorization: Bearer <token>` header
2. Verify JWT with `ACCESS_TOKEN_SECRET`
3. Attach decoded user to `request.loggedUser`

Example protected route:

```
GET /api/v1/auth/authcheck
Authorization: Bearer eyJhbG...
```

## Email verification

**API**: `POST /api/v1/auth/email-verification/request` (auth required) → `POST /api/v1/auth/email-verification/confirm` (auth required)

1. `request` takes `{ email }`, rejects it if another account already uses that email (`email_already_used`), and — if SMTP is configured — emails a 6-digit code and stores its **sha256 hash** (not the plaintext code) on the user record alongside the pending email and a 30-minute expiry.
2. `confirm` takes `{ code }`, hashes it and compares against the stored hash; on match the pending email becomes the user's real `email` and `email_verified` is set to `true`.
3. If SMTP isn't configured (see [Environment variables](../setup/environment-variables.md#email-smtp--optional)), `request` fails with `smtp_not_configured` (503) rather than the server refusing to boot.

Both endpoints are rate-limited the same way as OTP send (`request`: 5 per 15 minutes).

## Phone linking

**API**: `POST /api/v1/auth/phone-link/request` (auth required) → `POST /api/v1/auth/phone-link/confirm` (auth required)

Lets a user who signed up via a social provider (Google/LinkedIn — see `SOCIAL_AUTH_PROVIDERS` in `apps/api/src/constants.ts`) attach a phone number to their account, reusing the Twilio Verify OTP flow:

1. `request` takes `{ phone }`; rejects if the account isn't a social-auth account, already has a phone linked, or the phone is already registered to someone else — then sends an OTP.
2. `confirm` takes `{ phone, code }` and **re-checks the same eligibility (provider + not-already-linked) at confirm time**, not just at request time, before verifying the OTP and writing the phone.

Both endpoints are rate-limited the same way as OTP send (`request`: 5 per 15 minutes).

## Logout

**Frontend**: dispatches `logout()` action which:

- Clears Redux state
- Removes sessionStorage entries
- Clears the `access_token` cookie

## Environment variables

| Variable | Used by |
| --- | --- |
| `ACCESS_TOKEN_SECRET` | API — JWT signing |
| `ACCESS_TOKEN_TTL` | API — token expiry |
| `COOKIE_SECRET` | API — cookie plugin |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `SMTP_FROM_NAME` / `SMTP_SECURE` | API — email verification (optional, see [environment variables](../setup/environment-variables.md#email-smtp--optional)) |

## Security notes

- Never store raw passwords — only bcrypt hashes
- JWT secret must be long and random in production
- `NEXT_PUBLIC_*` vars must not contain secrets
- Proxy cookie check is UX-only; always validate tokens server-side
- Consider httpOnly cookies for production hardening

## Extending auth

Common next steps:

- Refresh tokens
- OAuth providers (Clerk, Auth0, etc.)
- Role-based access control (extend User model + admin autohooks)

Admin routes already have a hook scaffold at `apps/api/src/routes/v1/admin/autohooks.ts`.
