# US-212 Integration tests

## Task Prompts
- Write happy-path flow: create → poll → download (mocked or sandbox).
- Write error-paths: 400 invalid, 401, 429 with retry, 5xx with retry, failed job.

## Acceptance Criteria
- CI green; tests deterministic with mocks.
- Artifacts saved to temp and cleaned up.
