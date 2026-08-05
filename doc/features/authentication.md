# Authentication

End-to-end authentication flow between the Next.js frontend and Fastify API. This is the
binding reference for member authentication — code comments across the auth services that
say "see doc/reviews/authentication-contract.md" mean this file (that path was a
gitignored, never-committed local note; this committed doc is the real contract).

## Overview

**Member login is phone + password, Google, or LinkedIn only.** Email/password for
members does not exist — email is OAuth-only. **OTP is never a login mechanism** —
it only proves phone ownership for signup, phone linking, or password reset.

Both session tokens (access + refresh) live in **HttpOnly cookies** the API sets itself;
neither is ever present in a JSON response body or readable from frontend code.

```mermaid
sequenceDiagram
    actor User
    participant App as Next.js App
    participant Proxy as proxy.ts
    participant API as Fastify API
    participant DB as PostgreSQL

    User->>App: POST phone + password
    App->>API: POST /api/v1/auth/login-phone
    API->>DB: Find user + verify bcrypt + require phone_verified
    API-->>App: Set-Cookie access_token, refresh_token + { user }
    User->>App: Visit /projects
    App->>Proxy: Check access_token cookie
    Proxy-->>App: Allow
    App->>API: GET /api/v1/auth/authcheck (cookie sent automatically)
    API->>API: verifyToken (bearer header or cookie)
    API-->>App: user data
```

## Signup (phone + password, OTP-verified)

Signup is a three-step flow — sending and verifying an OTP only proves phone ownership;
it never creates a user or a session by itself. `register-phone` is the only place an
account is actually created.

1. `POST /api/v1/auth/otp/send` — `{ phone }`. Creates a `SIGNUP_VERIFICATION` OTP
   challenge (see [OTP challenges](#otp-challenges)) and sends it via TunisieSMS.
2. `POST /api/v1/auth/otp/verify` — `{ phone, code }`. Verifies the code and, on
   success, issues a one-time **signup grant** (`signupToken`) tied to that phone.
   Response: `{ verified: true, phone, signupToken }` — no tokens, no user, no session.
3. `POST /api/v1/auth/register-phone` — `{ phone, password, signupToken, name? }`.
   Consumes the signup grant (rejecting a missing/expired/already-used one as
   `invalid_signup_grant`), creates the account with `phone_verified: true`, and sets
   the session cookies.

**Frontend**: `apps/app/src/components/auth/register-form.tsx` drives this exact
sequence — send code, verify code (capturing `signupToken`), then register.

## Login (phone + password)

**API**: `POST /api/v1/auth/login-phone` — `{ phone, password }`.

Requires the account to have a password **and** `phone_verified: true`. Every failure
mode (unknown phone, no password set, unverified phone, wrong password) rejects with
the same generic `invalid_credentials` (401) so none of them can be distinguished from
one another.

`phone_verified` becomes `true` either through the signup grant above, or through
[phone linking](#phone-linking) confirming an OTP for an existing OAuth account.

**Frontend**: `apps/app/src/components/auth/login-form.tsx` — phone + password is the
only login form; there is no OTP-based login step anywhere in the UI.

## OTP challenges

**Service**: `apps/api/src/services/otp-challenge.ts`

Every OTP code is generated, hashed, and verified by this app itself — TunisieSMS only
delivers the text message, it does not manage the OTP lifecycle (unlike the Twilio
Verify integration this replaced). Purposes are scoped with the `OtpPurpose` enum:

- `SIGNUP_VERIFICATION` — proves phone ownership before an account exists.
- `PHONE_LINK` — proves ownership of a phone being attached to an existing OAuth account.
- `PASSWORD_RESET` — proves ownership before allowing a password change.

Each `OtpChallenge` row stores only a hash of the code (`VERIFICATION_CODE_SECRET`
HMAC), an expiry, and an attempt counter — never the plaintext code. A partial unique
index (`(phone, purpose) WHERE consumed_at IS NULL`) enforces at most one active
challenge per phone+purpose at a time; requesting a new one before that cooldown elapses
fails with `otp_resend_too_soon`. Every failure mode (no active challenge, expired, too
many attempts, wrong code) rejects with the same generic `invalid_otp`.

Tunable via environment: `OTP_TTL_MINUTES`, `OTP_MAX_ATTEMPTS`,
`OTP_RESEND_COOLDOWN_SECONDS`, `OTP_SIGNUP_GRANT_TTL_MINUTES` (see
[Environment variables](#environment-variables)).

## SMS delivery (TunisieSMS)

**Client**: `apps/api/src/lib/sms.ts`

A GET request to TunisieSMS's API with the message text and destination number.
Optional at startup — the API boots without `TUNISIESMS_KEY`; OTP-dependent endpoints
instead fail at request time with `sms_service_not_configured` (503). A non-`200`
`status_code` in the response, or the request itself failing, is reported as
`sms_delivery_failed` (502) — the request URL and its parameters (which carry the API
key and the OTP text) are never logged.

### Client-side session storage

```mermaid
flowchart LR
    Login[Successful login] --> Cookies[HttpOnly access_token + refresh_token cookies]
    Login --> Redux[Redux: status + user]
    Redux --> SS[sessionStorage: cached user only]
    Cookies --> Proxy[proxy.ts route guard]
    Redux --> UI[Dashboard UI]
```

Neither token is ever readable from **browser** frontend code — both leave the API only as
HttpOnly cookies (`apps/api/src/utils/member-session.ts`), attached automatically by
the browser on same-site requests. `apps/app/src/lib/api.ts`'s axios instance uses
`withCredentials: true` and, on the web, never attaches an `Authorization` header itself.

**Capacitor exception:** see [Mobile (Capacitor)](#mobile-capacitor).

Since no token is JS-visible on the web, "authenticated" can only be known by asking the API.
`AuthState.status` (`unknown | authenticated | unauthenticated`) starts as `'unknown'`
on every page load; `useBootstrapSession` (`apps/app/src/features/auth/hooks`) always
calls `GET /api/v1/auth/authcheck` once at mount to resolve it — a `status` value
carried over by redux-persist from a previous session is never trusted on its own,
since the cookie it implies may have since expired. Only the **user profile** (not a
token) is cached in `sessionStorage`, for fast optimistic rendering while that check
resolves. See `apps/app/src/lib/auth.ts`.

## Mobile (Capacitor)

**Shell**: `apps/mobile` — Capacitor wraps the live Next.js member app via
`CAPACITOR_SERVER_URL` (remote WebView). See `apps/mobile/README.md`.

Cross-origin WebViews cannot reliably use the browser cookie session alone, so native
clients opt into Bearer auth:

1. Every API request from Cap sends `X-Matchy-Client: mobile` (see `apps/app/src/lib/native.ts`).
2. Session-issuing routes (`login-phone`, `register-phone`, `oauth/exchange`, `refresh`)
   still set HttpOnly cookies **and**, when that header is present, also return
   `accessToken` + `refreshToken` in the JSON body.
3. Cap stores those JWTs in `localStorage` (`apps/app/src/lib/mobile-tokens.ts`) and
   attaches `Authorization: Bearer …` on axios calls. `POST /auth/refresh` accepts
   `{ refreshToken }` in the body when the cookie is missing.
4. `verifyToken` already accepts Bearer (see [API authorization](#api-authorization)).
5. Realtime WebSocket uses `?access_token=` on Cap (API already promotes the query param).
6. A non-HttpOnly `access_token` cookie is mirrored onto the **Next.js app origin** so
   `proxy.ts` can still gate routes when `MEMBER_COOKIE_DOMAIN` does not cover the
   WebView host (local emulator).

Browser clients omit `X-Matchy-Client` and never receive tokens in the body — the
cookie-only contract above is unchanged for them.

## Route protection (Next.js)

**File**: `apps/app/src/proxy.ts`

| Condition                                       | Action               |
| ------------------------------------------------ | -------------------- |
| No `access_token` cookie + protected route       | Redirect to `/login` |
| Has `access_token` cookie + `/login`             | Redirect to `/`       |
| Otherwise                                        | Continue             |

> This is an **optimistic cookie check** only — it does not verify JWT signatures. Real
> authorization happens on the API. The cookie is set by the API (not this app), but
> middleware can still read it from the `Cookie` header the browser sends alongside
> every request — `HttpOnly` only blocks `document.cookie` access from JS in the
> browser, not server-side header inspection.

## API authorization

**Plugin**: `apps/api/src/plugins/authorization.ts`

Protected routes use `preHandler: [fastify.verifyToken]`, which accepts the access
token from either source:

1. `Authorization: Bearer <token>` header (non-browser clients).
2. The admin panel's or member app's own HttpOnly cookie (`admin_access_token` /
   `access_token`), for browser clients that can't read either token to set a header.

Either way: verify the JWT with `ACCESS_TOKEN_SECRET`, reload the user row, reject
(401) if it's no longer `ACTIVE`, and attach it to `request.loggedUser`.

**API**: `GET /api/v1/auth/authcheck` (auth required)

Response:

```json
{
  "user": {
    "id": "clx...",
    "email": "jane@example.com",
    "phone": "+21612345678",
    "name": "Jane Doe",
    "auth_provider": "phone",
    "email_verified": false,
    "role": "USER"
  }
}
```

These are exactly the safe profile fields `apps/app` needs to render the logged-in
state — password, refresh tokens, OTP code hashes, and any other internal field are
never selected, let alone returned.

## Refresh tokens

**API**: `POST /api/v1/auth/refresh`

Every successful login/registration/OAuth-exchange issues an **access token**
(short-lived JWT, `ACCESS_TOKEN_TTL`) and a **refresh token** (long-lived,
`REFRESH_TOKEN_TTL_DAYS`), both as HttpOnly cookies. For browser clients they are
**never** in the response body. Capacitor clients that send `X-Matchy-Client: mobile`
also receive the pair in the JSON body (see [Mobile (Capacitor)](#mobile-capacitor)).
Refresh tokens are stored server-side as a `RefreshToken` row keyed by a **sha256
hash** of the token — the raw token itself is never persisted. The refresh cookie is
scoped to `Path=/api/v1/auth` — the browser never attaches it to any other request,
shrinking where a stolen refresh token could otherwise be replayed from.

`POST /api/v1/auth/refresh` takes the refresh token from its HttpOnly cookie, or —
for Capacitor — from an optional `{ refreshToken }` body, and **rotates** it: the
presented token is looked up by its hash, checked for revocation/expiry, then revoked
and replaced in the same call, with both new cookies set on the response (and body
tokens again for mobile). The old refresh token cannot be used again after this.

`POST /api/v1/auth/logout` reads the refresh cookie, best-effort revokes it, and
clears both cookies regardless of whether revocation succeeded. Changing your password
revokes **every** refresh token on the account (`revokeAllRefreshTokens`), forcing
re-login on all devices — the same happens on a password reset via OTP.

## Phone linking

**API**: `POST /api/v1/auth/phone-link/request` (auth required) → `POST /api/v1/auth/phone-link/confirm` (auth required)

Lets a user who signed up via a social provider (Google/LinkedIn — see
`SOCIAL_AUTH_PROVIDERS` in `apps/api/src/constants.ts`) attach a phone number to their
account, using a `PHONE_LINK`-purpose OTP challenge:

1. `request` takes `{ phone }`; rejects if the account isn't a social-auth account,
   already has a phone linked, or the phone is already registered to someone else —
   then sends an OTP.
2. `confirm` takes `{ phone, code }` and **re-checks the same eligibility** (provider +
   not-already-linked) **at confirm time**, not just at request time, before verifying
   the OTP and writing the phone. A successful confirm also sets `phone_verified: true`
   — a completed OTP check is real proof of ownership, the same as signup, making the
   account eligible for phone+password login going forward.

   Verification is also bound to the confirming caller's `userId`, not just phone +
   code (`OtpChallengeService.verifyChallenge`'s `expectedUserId` param) — otherwise any
   authenticated caller who obtained a valid code could confirm a challenge that was
   requested by a different account.

Both endpoints are rate-limited the same way as OTP send (`request`: 5 per 15 minutes).

## Password reset (phone + OTP)

**API**: `POST /api/v1/auth/password-reset/request` → `POST /api/v1/auth/password-reset/confirm`

1. `request` takes `{ phone }` and always returns the same uniform success response,
   whether or not that phone has a password-based account — an OTP (`PASSWORD_RESET`
   purpose) is only actually sent when it does, so the response can't be used to probe
   which phones have accounts.
2. `confirm` takes `{ phone, code, newPassword }`, verifies the OTP, updates the
   password without touching `auth_provider`, and revokes every existing refresh token
   on the account.

## Google & LinkedIn OAuth

First-party OAuth via [`@fastify/oauth2`](https://github.com/fastify/fastify-oauth2) — no third-party auth provider (Clerk, Auth0, etc.) is used or planned.

**Plugin**: `apps/api/src/plugins/oauth.ts` registers a separate `@fastify/oauth2` instance per provider (`oauth2Google`, `oauth2LinkedIn`), each providing its own `/api/v1/auth/oauth/<provider>` start-redirect route with built-in state/CSRF cookie handling. **Each provider is independent and optional**: it's only registered when both its client id and secret are set (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`) — a missing pair disables just that provider's route, the API still starts normally, and the other provider is unaffected.

**Callbacks**: `GET /api/v1/auth/oauth/google/callback` and `GET /api/v1/auth/oauth/linkedin/callback`, implemented in `routes/v1/auth/actions.ts` (kept alongside the other auth routes; only the two `@fastify/oauth2` plugin instances live in `plugins/oauth.ts`). Profile-fetching is delegated to dedicated helpers — `lib/google-oauth.ts` / `lib/linkedin-oauth.ts` — each calling the provider's OIDC `userinfo` endpoint with the access token `@fastify/oauth2` already validated.

On a successful callback:

1. `services/oauth-authentication.ts`'s `findOrCreateOAuthUser` looks up the user by provider id (`google_id`/`linkedin_id`); if none exists, it links the provider to an existing account with a matching email — **regardless of that account's `email_verified` flag**, since every OAuth provider has already verified the email on its own side, and merges it (setting `email_verified: true`) — or otherwise creates a new user.
2. A short-lived, single-use **exchange code** is minted (`createExchangeCode`) and the browser is redirected to `${FRONTEND_URL}/oauth-callback?code=...`.
3. On failure (profile fetch failure or a disabled provider), the browser is redirected to `${FRONTEND_URL}/oauth-callback?error=...` instead — a top-level browser redirect can't carry a JSON error body, so there's no HTTP error response to read here.

**Exchange codes** (`OAuthExchangeCode` table): only a **sha256 hash** of the code is stored, never a token — alongside `user_id`, `expires_at`, and `consumed_at` (null until used). The SPA calls `POST /api/v1/auth/oauth/exchange` with `{ code }`; `consumeExchangeCode` rejects a code that's missing, expired, or already consumed (`invalid_exchange_code`), otherwise marks it consumed and — **only at this point** — calls the existing `TokenService.issueTokenPair()` to mint a real access/refresh token pair, set as cookies. No tokens exist anywhere until a valid code is actually exchanged.

**Frontend**: `apps/app/src/components/auth/oauth-callback.tsx` reads `?code=`/`?error=`,
calls the exchange endpoint, and routes into the app on success — the same
`resolvePostAuthDestination` next-param handling used by the phone-password flow (see
[Client-side session storage](#client-side-session-storage)).

## Logout

**Frontend**: dispatches the `logout()` thunk, which POSTs `/api/v1/auth/logout` (no
body — best-effort) then clears Redux state and the cached user in `sessionStorage`.
The API clears both HttpOnly cookies on its response; the frontend cannot clear them
itself.

## Account deletion

**API**: `DELETE /api/v1/auth/account` (auth required)

```json
{
  "confirm": true,
  "currentPassword": "only required if the account has a password",
  "reason": "optional, logged server-side only"
}
```

- `confirm: true` is **always required**, regardless of how the account authenticates — a missing or `false` value is rejected (`account_deletion_not_confirmed`, 400) before anything else is checked.
- If the account **has a password** (phone/password accounts), `currentPassword` is also required and verified against the stored hash — both a missing and an incorrect password are rejected as `invalid_current_password` (400).
- If the account **has no password** (OAuth-only accounts), no password check applies — `confirm: true` alone is sufficient.
- `reason` is optional and never required; when present it's logged server-side (`request.log.info`) for support/analytics purposes only — it isn't stored on the user record or used in the deletion decision.
- Rate-limited with the strict tier (`RATE_LIMIT_STRICT`: 3 requests per hour) — deliberately tighter than the other auth tiers, since this is destructive and hard to undo.
- **This is currently a hard delete**: `prisma.user.delete()` removes the row outright. `RefreshToken`, `OAuthExchangeCode`, and `OtpChallenge` rows for that user are removed automatically via Prisma's `onDelete: Cascade`. This endpoint does not use the `status` enum (`ACTIVE`/`INACTIVE`/`BANNED`) at all — that field exists for admin moderation, not self-service deletion — so there is no soft-delete path here: deleting is permanent and immediate.
- The response body is `{ message }` only; no user object (and therefore no password field) is ever returned.

## CSRF: Origin/Referer validation

**Plugin**: `apps/api/src/plugins/origin-guard.ts`

Now that sessions ride on cookies the browser attaches automatically, every
state-changing request (`POST`/`PUT`/`PATCH`/`DELETE`) across the whole API — not just
auth routes — is checked against `CORS_ORIGINS` (the same allowlist `plugins/cors.ts`
already uses): if the request presents an `Origin` (or, failing that, a `Referer`)
that isn't one of the deployed frontends, it's rejected with `origin_not_allowed`
(403). A request with neither header — a non-browser client authenticating with its
own bearer token, not an ambient cookie — passes through unchecked, since there is
nothing here for this specific defense to protect against. `SameSite=Lax` on both
session cookies already blocks most cross-site cookie-bearing requests; this closes
the remaining gap (e.g. a plain HTML form POST) with no separate CSRF-token machinery.

## Environment variables

| Variable                                                                                      | Used by                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACCESS_TOKEN_SECRET`                                                                           | API — JWT signing                                                                                                                                                 |
| `ACCESS_TOKEN_TTL`                                                                              | API — token expiry                                                                                                                                                |
| `COOKIE_SECRET`                                                                                 | API — cookie plugin                                                                                                                                               |
| `REFRESH_TOKEN_SECRET`                                                                          | API — refresh token signing (see [Refresh tokens](#refresh-tokens))                                                                                               |
| `REFRESH_TOKEN_TTL_DAYS`                                                                        | API — refresh token lifetime                                                                                                                                      |
| `VERIFICATION_CODE_SECRET`                                                                      | API — HMAC key used to hash phone OTP codes before storage (never the plaintext code)                                                                            |
| `TUNISIESMS_KEY` / `TUNISIESMS_SENDER`                                                          | API — phone OTP delivery (optional at startup; required only for OTP-dependent endpoints, see [SMS delivery](#sms-delivery-tunisiesms))                          |
| `OTP_TTL_MINUTES` / `OTP_MAX_ATTEMPTS` / `OTP_RESEND_COOLDOWN_SECONDS` / `OTP_SIGNUP_GRANT_TTL_MINUTES` | API — OTP challenge lifecycle tuning (optional, sensible defaults — see [OTP challenges](#otp-challenges))                                                        |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`   | API — Google/LinkedIn OAuth (optional per provider, see [environment variables](../setup/environment-variables.md#google--linkedin-oauth--optional-per-provider)) |
| `API_BASE_URL` / `FRONTEND_URL`                                                                 | API — OAuth callback URL and SPA redirect target                                                                                                                  |
| `OAUTH_EXCHANGE_CODE_TTL_SECONDS`                                                                | API — OAuth exchange code lifetime (default 60s)                                                                                                                  |
| `CORS_ORIGINS`                                                                                   | API — allowed browser origins, shared by the CORS plugin and the Origin/Referer CSRF guard (see [CSRF](#csrf-originreferer-validation))                          |
| `ADMIN_COOKIE_DOMAIN` / `MEMBER_COOKIE_DOMAIN`                                                   | API — cookie `Domain` attribute, only needed when the API and the panel/app sit on different subdomains                                                          |

## Security notes

- Never store raw passwords — only bcrypt hashes
- JWT secret must be long and random in production
- `NEXT_PUBLIC_*` vars must not contain secrets
- Both session tokens are HttpOnly cookies for **browser** clients — never in a JSON
  body, never readable from web JS. Capacitor is the documented exception
  (`X-Matchy-Client: mobile` → body tokens + Bearer); see [Mobile (Capacitor)](#mobile-capacitor)
- Proxy cookie check is UX-only; always validate tokens server-side
- Origin/Referer validation is defense-in-depth for CSRF, not a substitute for
  `SameSite=Lax`

## Extending auth

Common next steps:

- Role-based access control (extend User model + admin autohooks)
- Full identity/profile onboarding after signup (tracked as separate follow-up work,
  not part of this contract)

Admin routes already have a hook scaffold at `apps/api/src/routes/v1/admin/autohooks.ts`.
