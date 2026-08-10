---
name: api-route-handler
description: Implement a Fastify API route handler and service method with schema validation, generics typing, and try/catch error handling in apps/api.
---

# Fastify API Route Implementation Guide

Follow these steps when adding or updating an API route in `apps/api`:

## 1. Request & Response Typing (`apps/api/src/types/<feature>.ts`)
Define explicit, named TypeScript types for path params, query strings, and request bodies. Do not inline anonymous types in route signatures.

```ts
export type MyFeatureParams = { id: string };
export type MyFeatureBody = { name: string };
```

## 2. JSON Schema Validation (`apps/api/src/schemas/v1/<feature>.ts`)
Define AJV/OpenAPI JSON schemas. Include:
- `tags: ['<feature>']` (required for Swagger)
- `summary` and `description`
- `security: [{ http: [] }]` for authenticated routes
- `additionalProperties: false` on request bodies

## 3. Service Layer Method (`apps/api/src/services/<feature>.ts`)
- Use service classes with constructor dependency injection (`AbstractServiceOptions`).
- Wrap all async methods in `try/catch`.
- Do not export standalone business functions outside classes in `services/`.

```ts
async myMethod(userId: string, body: MyFeatureBody): Promise<MyFeatureResult> {
  try {
    // Business logic with Prisma
    return result;
  } catch (err) {
    throw err;
  }
}
```

## 4. Route Action Handler (`apps/api/src/routes/v1/<feature>/actions.ts`)
- Use Fastify generic type arguments matching named types: `<{ Params: MyFeatureParams; Body: MyFeatureBody }>`.
- Wrap handler body in `try/catch` and rethrow `catch (err) { throw err; }`.

```ts
fastify.post<{ Params: MyFeatureParams; Body: MyFeatureBody }>(
  '/:id/action',
  { schema: mySchema },
  async (request, reply) => {
    try {
      const data = await service.myMethod(request.loggedUser.id, request.body);
      return reply.code(200).send(data);
    } catch (err) {
      throw err;
    }
  },
);
```

## 5. Verification
Run tests to verify:
```bash
pnpm --filter @saas-boilerplate/api test
```
