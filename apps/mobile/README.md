# Matchy+ Mobile (`apps/mobile`)

Capacitor native shell for the member Next.js app (`apps/app`). Landing and admin stay web-only.

## Why remote URL (not a static `webDir` export)

`apps/app` is Next.js with `output: 'standalone'` (Docker/K8s Node server + `proxy.ts`).
Capacitor therefore loads the **running app host** via `CAPACITOR_SERVER_URL`, matching the
“keep current webview wrap” plan. The `www/` folder is only a Cap CLI placeholder.

Auth against the Fastify API uses the **new `/api/v1` routes** with:

| Client | Session |
|--------|---------|
| Browser | HttpOnly cookies (unchanged) |
| Capacitor | `X-Matchy-Client: mobile` + `X-Matchy-Mobile-Key` (`MOBILE_CLIENT_SECRET` via native plugin) → body tokens + Bearer |

Set the same `MOBILE_CLIENT_SECRET` in the API env and in the Android build
(`MOBILE_CLIENT_SECRET` env when running Gradle, or `android/keystore.properties`).

See [Authentication — Mobile (Capacitor)](../../doc/features/authentication.md#mobile-capacitor).

Release signing passwords live only in gitignored `keystore.properties` — never in
`build.gradle`. Debug builds use the default debug keystore.

## Layout

```
apps/
├── landing/   # marketing site
├── app/       # member Next.js app (shared with mobile WebView)
├── admin/     # admin dashboard
├── api/       # Fastify API (Bearer + cookies)
└── mobile/    # Android shell (this folder)
```

## Modes

### Remote URL (dev / hot reload) — recommended

```bash
# Terminal 1 — from repo root
pnpm dev

# Terminal 2 — Android emulator → host machine Next.js on :3000
cd apps/mobile
cp .env.example .env   # set CAPACITOR_SERVER_URL=http://10.0.2.2:3000
pnpm install           # from repo root once: pnpm install
pnpm sync:android
pnpm open:android
```

Or from the monorepo root:

```bash
pnpm mobile:dev
```

Physical device on the same LAN:

```bash
CAPACITOR_SERVER_URL=http://192.168.x.x:3000 pnpm sync:android
```

Staging / production remote URL:

```bash
CAPACITOR_SERVER_URL=https://app.example.com pnpm sync:android
```

Ensure `NEXT_PUBLIC_API_URL` on that app deploy points at the live API, and staging/prod
`CORS_ORIGINS` includes the app host.

For **local emulator** development, the Next.js app must be built/run with an API URL the
emulator can reach (not `localhost` on the device itself):

```bash
# e.g. in .env.development when testing Cap against a host API
NEXT_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
```

Physical devices should use your LAN IP instead of `10.0.2.2`.

### Bundled placeholder

Without `CAPACITOR_SERVER_URL`, Cap serves `www/index.html` (instructions only). A full
offline/static bundle would require a separate static export pipeline — not used today.

## Scripts

| Script | Description |
|--------|-------------|
| `sync` / `sync:android` | `cap sync` (uses `CAPACITOR_SERVER_URL` from env) |
| `open:android` | Open Android Studio |
| `run:android` | Sync + run on device/emulator |
| `dev:remote` | Emulator remote URL (`10.0.2.2:3000`) + open Studio |

Root shortcuts: `pnpm mobile:sync`, `pnpm mobile:open`, `pnpm mobile:dev`.

## Native plugins

| Plugin | Used for |
|--------|----------|
| `@capacitor/geolocation` | GPS in `apps/app` location context when native |
| `@capacitor/camera` | Declared for future native capture / permissions |
| **LocationGate** (custom Android) | Detect / prompt enable device GPS |

## First-time Android project

After `pnpm install` at the repo root:

```bash
cd apps/mobile
npx cap add android   # once
# then copy LocationGate plugin sources if regenerating the project
pnpm sync:android
```
