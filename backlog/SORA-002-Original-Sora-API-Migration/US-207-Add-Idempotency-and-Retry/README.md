# US-207 Add Idempotency and Retry/backoff

## Task Prompts
- Add `Idempotency-Key` header to create requests (plumb through API).
- Implement retry with exponential backoff for 429/5xx (bounded attempts).

## Acceptance Criteria
- Duplicate create retries do not create multiple jobs.
- Backoff policy configurable and unit-tested.
