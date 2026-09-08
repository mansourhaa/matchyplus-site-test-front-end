# Fastify API Standards (Antigravity Rules)

## 1. Modular Architecture & Plugin Encapsulation

- **Layered Structure**:
  - `routes/v1/<feature>/actions.ts`: HTTP route handlers only.
  - `routes/v1/<feature>/autohooks.ts`: Route lifecycle hooks (e.g. `verifyToken`, `verifyAdmin`).
  - `services/<feature>.ts`: Business logic and database operations inside Service classes with dependency injection (`AbstractServiceOptions` / `prisma`, `quota`, `emails`).
  - `schemas/v1/<feature>.ts`: AJV / OpenAPI JSON Schemas.
  - `types/<feature>.ts`: TypeScript types for request bodies, query, params, responses.
  - `utils/`: Pure helper functions.
- **Service Isolation**: Do not export free standalone business functions from `services/` files. All business operations belong inside service classes.
- **Shared Functionality**: Use `fastify-plugin` (`fp`) for plugins that decorate the Fastify instance or configure cross-cutting infrastructure (auth, error-handler, prisma).

## 2. Schema Validation & Serialization

- **Mandatory JSON Schemas**: Every route must declare a Fastify `schema`.
- **OpenAPI / Swagger Compatibility**:
  - `tags: ['...']` is required on every route schema for Swagger visibility (`hideUntagged: true`).
  - Provide `summary` (and `description` when non-obvious).
  - Include `security: [{ http: [] }]` on authenticated routes.
  - Specify `additionalProperties: false` on request bodies and query objects.
  - Define explicit `response` shapes for success (`200`/`201`) and errors (`4xx`/`500`).
- **No Manual Validation**: Never perform manual payload validation inside route handlers if a JSON schema is declared. Fastify validates payloads automatically during the `preValidation` hook.

## 3. Strict TypeScript Request & Reply Typing

- **Named Type Generics**: Every route accepting a `Body`, `Querystring`, or `Params` must declare Fastify generics using a named type object imported from `types/<feature>.ts`:
  ```ts
  fastify.post<{ Body: CreateMatchBody; Querystring: MatchQuery; Params: MatchParams }>(
    '/matches',
    { schema: createMatchSchema },
    async (request, reply) => { ... }
  );
  ```
- **Zero Inline Anonymous Types**: Never inline anonymous `{ id: string }` type literals in route handler signatures.
- **Zero `any` Types**: Always type database return shapes and external payload mappings explicitly.

## 4. Error Handling & Request Lifecycle

- **Try / Catch Rule**:
  - Wrap every async route handler in `try/catch`.
  - In route `catch (err)`, rethrow `throw err` so that `plugins/error-handler.ts` can format the HTTP response consistently.
  - In service methods, catch errors only to rethrow, add domain context, or map to domain HTTP errors (`utils/http-errors.ts`). Never return silent success on failure.
- **Async/Await Only**: Never mix callback-style handlers with promises. Never call `reply.send()` *and* return a value from the same async handler.
