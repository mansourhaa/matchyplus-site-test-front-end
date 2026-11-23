# Voice AI & Matching Agents — Prod-Readiness Fixes (#226 / #227)

Follow-up fixes from the post-merge re-review of #226 and #227 before pushing to production:

## From #226 (`feat(ai): voice AI onboarding`)

- [ ] **High — Shared `uploads` storage (`apps/api` ↔ `apps/ai`)**: `apps/api/src/services/video-analysis.ts` writes temporary clips to `ONBOARDING_CLIPS_DIR` and `apps/ai/app/processors/analyze_video.py` reads from `AI_UPLOADS_DIR`. Ensure `api` and `ai` share an RWX PVC in `deploy/k8s` (or transfer/clean up clips safely across pods) so `ANALYZE_VIDEO` does not fail with `MEDIA_NOT_FOUND` in prod.
- [ ] **Medium — `sweepStaleClips()` in request hot path (`apps/api/src/services/video-analysis.ts#L69`)**: Move `sweepStaleClips()` (`readdir` + `stat` on every `POST /video-analysis`) out of the upload request path into a periodic/background cleanup.
- [ ] **Medium — `candidateUrls()` sequential timeout (`apps/api/src/services/voice-relabel.ts#L49-L61`)**: Avoid up to `5s + 5s = 10s` sequential timeout when `host.docker.internal` stalls.

## From #227 (`feat(ai): rank the home feed with the matching agents`)

- [ ] **Medium — `scoring_version` (`apps/api/src/services/discovery.ts#L245`)**: Return a distinct `scoring_version` (e.g. `'agents'`) instead of `'v5-scripted'` when `MATCHING_ENGINE=agents` ranks the feed.
- [ ] **Low — Redis cache for learned `SwipeLog` weights (`apps/api/src/services/voice-agents.ts#L121-L133`)**: Cache the learned preference weights in Redis instead of querying 500 `SwipeLog` rows + full target profiles on every `getSwipeFeed` call (including `offset > 0`).
