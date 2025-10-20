# US-204 Implement `createVideo()` (POST /v1/videos)

## Task Prompts
- Implement method signature `createVideo(req)` with v1 fields.
- Send `Idempotency-Key` header (UUID) when provided.
- Validate req: model present (`sora-1-turbo`), duration/resolution within limits.

## Acceptance Criteria
- Returns job object with `id`, `status`.
- Error handling: 400/401/429/5xx mapped to app errors; retries only for 429/5xx (see US-207).
