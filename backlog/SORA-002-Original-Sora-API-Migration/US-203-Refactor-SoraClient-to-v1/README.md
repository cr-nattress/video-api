# US-203 Refactor `src/clients/SoraClient.ts` to v1

## Task Prompts
- Set `baseURL` to `https://api.openai.com/v1`.
- Use `Authorization: Bearer ${OPENAI_API_KEY}`; remove Azure header.
- Remove v2-only code paths, audio/remix/storyboard flags.
- Introduce request/response types limited to v1.

## Acceptance Criteria
- `SoraClient.ts` compiles; unit tests green.
- No references to v2-only fields remain.
