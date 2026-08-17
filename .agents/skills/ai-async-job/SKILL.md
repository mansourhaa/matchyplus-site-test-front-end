---
name: ai-async-job
description: End-to-end integration for async AI jobs using Redis Streams queue, Flask worker (apps/ai), Fastify API, and packages/ai-contracts.
---

# AI Async Jobs (Option C) Integration Guide

Follow this architecture for async AI tasks (e.g. `SUMMARIZE`, `MATCH_SCORE`, reranking):

```text
Next.js App --> Fastify /api/v1/ai/jobs --> Redis Streams (ai:jobs) --> Flask Worker (apps/ai) --> Postgres AiJob
```

## Step 1: Update Contracts (`packages/ai-contracts`)
1. Export the new job type in `src/job-types.ts`.
2. Define input/output payload schemas.
3. Build and test: `pnpm --filter @saas-boilerplate/ai-contracts build`.

## Step 2: Database Schema (`packages/database/prisma/schema.prisma`)
1. Add job type to `AiJobType` enum if new.
2. Run Prisma generate: `pnpm --filter @saas-boilerplate/database db:generate`.

## Step 3: Fastify Queue API (`apps/api`)
1. Add route in `routes/v1/ai/actions.ts` (`POST /api/v1/ai/jobs`).
2. Authenticate with JWT (`verifyToken`).
3. Create `AiJob` record with status `PENDING`.
4. Stream job to Redis Streams via `XADD ai:jobs * payload ...`.
5. Return 202 Accepted with `job_id`.

## Step 4: Worker Processor (`apps/ai`)
1. Handle job type in `app/worker.py`.
2. Consume stream message with `XREADGROUP`.
3. Process task asynchronously.
4. Update `AiJob` status to `RUNNING` -> `SUCCEEDED` / `FAILED` in Postgres.

## Step 5: Frontend Polling UI (`apps/app`)
1. Dispatch job enqueue via feature thunk.
2. Poll `/api/v1/ai/jobs/:id` until status is `SUCCEEDED` or `FAILED`.
