# Epic Index: SORA-002 Original Sora API Migration

- US-201 Define Scope and Constraints
- US-202 Update Documentation: `documentation/sora-api-v1.md`
- US-203 Refactor `src/clients/SoraClient.ts` to v1
- US-204 Implement `createVideo()` (POST /v1/videos)
- US-205 Implement `getVideo()` (GET /v1/videos/{id})
- US-206 Implement `downloadVideo()` (GET /v1/videos/{id}/content)
- US-207 Add Idempotency and Retry/backoff
- US-208 Remove v2-only features
- US-209 Validate inputs (duration/resolution)
- US-210 Minimal Files upload flow (optional)
- US-211 Adjust API endpoints layer (if present)
- US-212 Integration tests (end-to-end happy/edge paths)
- US-213 Observability & logging
- US-214 Migration plan & release notes
