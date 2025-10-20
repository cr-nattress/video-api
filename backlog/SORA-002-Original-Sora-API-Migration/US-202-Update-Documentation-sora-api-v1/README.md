# US-202 Update Documentation: `documentation/sora-api-v1.md`

## Task Prompts
- Remove Azure preview details, `api-key`, `api-version`.
- Use base URL `https://api.openai.com/v1` and `Authorization: Bearer`.
- Keep only v1 endpoints and fields; remove v2 features (audio/remix/relaxed queue/webhooks unless actually implemented).
- Provide minimal JSON examples for create/status/download.

## Acceptance Criteria
- `documentation/sora-api-v1.md` reflects only original Sora v1 scope.
- Examples run with mock keys and match client shapes.
