# US-201 Define Scope and Constraints

## Goal
Lock scope to original Sora v1 API.

## Task Prompts
- Identify allowed endpoints: `POST /v1/videos`, `GET /v1/videos/{id}`, `GET /v1/videos/{id}/content`, optional `DELETE`.
- Define request fields: `model`, `prompt`, optional `width`, `height`, `n_seconds`, `n_variants`.
- Explicitly exclude v2 items: audio/remix/storyboard/queue-relaxed.
- Document durations (1–20s) and max resolution (<=1080p).

## Acceptance Criteria
- Written one-pager added to epic root describing scope, non-goals, constraints.
- Team alignment note in PR.
