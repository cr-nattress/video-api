# US-205 Implement `getVideo()` (GET /v1/videos/{id})

## Task Prompts
- Implement polling-friendly getter.
- Map statuses: `queued`, `in_progress`, `completed`, `failed`, `cancelled`.

## Acceptance Criteria
- Consumers can poll at intervals; typed response.
- Proper error surface for `failed` with `failure_reason` if present.
