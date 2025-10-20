# US-206 Implement `downloadVideo()` (GET /v1/videos/{id}/content)

## Task Prompts
- Stream/buffer binary MP4 and persist to file/storage as needed.
- Enforce `completed` status before download (or let caller decide).

## Acceptance Criteria
- Binary saved; content-type respected.
- Handle short-lived URLs if redirected.
