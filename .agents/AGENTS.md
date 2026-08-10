# Project Guidelines & Rules — Full Stack SaaS Boilerplate

Central agent rules for **Matchy+ / Full Stack SaaS Boilerplate** monorepo.

---

## 1. General Repository Rules

### No AI Attribution Rule
- **Never mention, credit, or reference AI coding tools** in any project artifact (git commits, PR titles/descriptions, code comments, documentation, issue comments, changelogs, or team communications).
- Do not add AI co-author trailers (`Co-authored-by: ...` for AI agents).
- Write all code, commits, documentation, and reviews as if authored solely by the human developer.

### Workspace & Build Conventions
- **Monorepo Structure**: Turborepo + `pnpm` workspaces (`apps/app`, `apps/api`, `apps/admin`, `apps/landing`, `apps/ai`, `packages/database`, `packages/types`, `packages/ui`, `packages/ai-contracts`).
- **Build & Test Verification**: Never declare a task complete without running verification commands (`pnpm build`, `pnpm test`, `pnpm lint`).

---

## 2. API Conventions (`apps/api`)

### Architecture & Directory Layout
```text
routes/v1/<feature>/actions.ts   # HTTP route handlers
routes/v1/<feature>/autohooks.ts # Route hooks (verifyToken / verifyAdmin)
services/<feature>.ts            # Service CLASSES + business logic methods (DI via constructor)
schemas/v1/<feature>.ts          # AJV / OpenAPI JSON Schemas
types/<feature>.ts               # TypeScript types for request bodies, query, params, responses
utils/                           # Pure helpers & free functions only
constants.ts                     # Shared constants & environment defaults
```

### Strict Layout Rules
- **`services/`**: Contains **only service classes** and their methods. Inject dependencies via the constructor (`AbstractServiceOptions` / `prisma`, `quota`, `emails`, etc.). Do **not** export standalone business functions from `services/` files.
- **`utils/`**: Contains pure helper functions (no service classes).
- **`constants.ts`**: Shared constants and defaults.

### Schema Validation (Required for All Routes)
- Every HTTP route **must** declare a Fastify `schema`.
- Each route schema **must** include:
  - `tags: ['...']` — required for Swagger visibility (`hideUntagged: true` is enabled).
  - `summary` (and `description` when non-obvious).
  - `security: [{ http: [] }]` on authenticated routes.
  - Request validation (`body`, `querystring`, `params` as needed).
  - `additionalProperties: false` on request bodies and strict param objects.
  - `response` with success shape and error shapes (`4xx`, `500`).
- Do **not** ship routes without schemas or tags.

### Route Request Typing (Required)
- Every route accepting a **body**, **querystring**, or **path params** must declare Fastify generics using a **named type object** imported from `types/<feature>.ts`.
- Do **not** inline anonymous object types in the route signature.
- Generic keys must match the request part: `Body`, `Querystring`, `Params`.

```ts
// types/matching.ts
export type DiscoveryFeedQuery = {
  latitude?: number;
  longitude?: number;
  limit?: number;
};

// routes — correct
fastify.get<{ Querystring: DiscoveryFeedQuery }>('/swipe-feed', { schema }, handler);
```

### Error Handling & Try-Catch Rules
- **Every route handler and every async service method must be wrapped in `try/catch`**.
- **Routes**: In `catch (err)`, rethrow `throw err` so `plugins/error-handler.ts` can format the HTTP response.
- **Service methods**: Catch errors only to rethrow, map to a domain/HTTP error (`utils/http-errors.ts`), or add context — never return silent success on failure.

### Auth & Security
- Protected routes: use `autohooks` -> `verifyToken`; admin routes also require `verifyAdmin`.
- Never return password hashes; use explicit Prisma `select`.
- Enforce role hierarchy for admin mutations (e.g. SUPPORT role cannot ban or edit SUPER_ADMIN).
- Reject non-`ACTIVE` users on login and authentication checks.

---

## 3. Frontend Conventions (`apps/app`)

### Directory Layout
```text
src/app/                 # App Router pages & layouts
src/features/<feature>/  # Domain types, store/slice, hooks, feature components
src/components/          # Shared UI composition
src/lib/                 # API clients, auth helpers, Redux store
```

### Feature Architecture
- Organize code by domain feature under `src/features/<feature>/` for state, types, hooks, and components.
- Use `@saas-boilerplate/ui` and shared Tailwind CSS v4 design system.
- Perform network calls via the configured `api` client (axios wrapper) or Redux feature thunks. Never bypass auth or hardcode secrets.

### Request & Response Typing (Required)
- Every API call payload, query, path parameter, and response shape must use a **named type** imported from `features/<feature>/types.ts`.
- Do **not** inline anonymous objects in thunks or hooks.

```ts
// correct
async (coords: DiscoveryFeedQuery | undefined) => {
  const response = await api.get<SwipeFeedResponse>('/discovery/swipe-feed', { params: coords });
}
```

### Error Handling & State Rules
- **Every async thunk that calls the API must use `try/catch`** and return `rejectWithValue(...)` on failure.
- Async UI handlers dispatching network thunks must use `try/catch`.
- Map network errors to stable i18n keys (`apiErrorKey`) for user-facing messages.
- Do not call `setState` synchronously within a `useEffect` body to prevent cascading render warnings; defer state updates asynchronously when needed.
- Do not read React `ref.current` during rendering.

### Redux Selectors
- Do not wrap identity/pass-through selectors in `createSelector`; export plain selector functions instead.

---

## 4. Location & Matching Rules

### Strict Location Gating
- Access to swipe feeds (`DiscoverView`) and search lists (`SearchView`) requires active, granted location permission.
- If location is not enabled, denied, or revoked:
  - Clear cached location coordinates (`localStorage`) and set `locationSynced = false`.
  - Do **not** auto-fallback to IP geolocation when permission was denied.
  - Reset profile lists in Redux (`clearFeed()`) and local component state (`setProfiles([])`).
  - Render `LocationRequiredOverlay` to block access until location is granted.

### Freemium Visibility & AI Recommendations (3-Visible Rule)
- **Top AI Picks & Search Visibility**:
  - The first 3 profiles (ranks #1, #2, #3 / indexes 0, 1, 2) are unlocked and fully visible.
  - Profiles at rank #4 and beyond (index >= 3 or `is_locked: true`) **must be rendered as locked and blurry** with masked names (`███████`), blurred photos (`filter: blur(...)`), blurred role details, and a VIP lock badge.
  - Clicking a locked/blurry recommendation prompts the upgrade/quota modal.
