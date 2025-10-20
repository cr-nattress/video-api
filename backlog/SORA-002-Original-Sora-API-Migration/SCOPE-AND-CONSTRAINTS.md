# SORA-002 Scope and Constraints Document

**Epic:** SORA-002 - Original Sora API Migration
**Date:** October 17, 2025
**Status:** Approved
**Version:** 1.0

---

## Executive Summary

This epic migrates the video-api from a mixed/preview Sora 2 implementation to the **original Sora v1 API** (sora-1-turbo model). The goal is to align with the officially documented and currently available Sora API endpoints, ensuring a stable, production-ready integration.

---

## Scope

### ✅ In Scope

#### 1. Sora v1 API Endpoints

The following endpoints will be implemented:

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/v1/videos` | POST | Create video generation job | **Required** |
| `/v1/videos/{id}` | GET | Get job status and details | **Required** |
| `/v1/videos/{id}/content` | GET | Download generated video | **Required** |
| `/v1/videos/{id}` | DELETE | Cancel/delete job | Optional |

**Base URL:** `https://api.openai.com/v1`

**Authentication:** Bearer token via `Authorization: Bearer {OPENAI_API_KEY}`

#### 2. Sora v1 Model

**Model Name:** `sora-1-turbo`

**Capabilities:**
- Text-to-video generation
- Duration: 1-20 seconds
- Resolution: Up to 1080p (1920×1080)
- **No audio generation** (silent output only)
- Multiple variants support (n_variants: 1-4, resolution-dependent)

#### 3. Request Parameters

**Required Fields:**
- `model`: String - Must be `"sora-1-turbo"`
- `prompt`: String - Natural language video description

**Optional Fields:**
- `n_seconds`: Integer (1-20) - Video duration in seconds
- `width`: Integer - Video width in pixels
- `height`: Integer - Video height in pixels
- `n_variants`: Integer (1-4) - Number of video variations to generate

**Supported Resolutions:**
- 1920×1080 (Full HD landscape)
- 1080×1920 (Full HD portrait)
- 1080×1080 (Square)
- 720×1280 (HD portrait)
- 1280×720 (HD landscape)
- Other custom resolutions ≤1080p

**Supported Aspect Ratios:**
- 16:9 (landscape)
- 9:16 (portrait)
- 1:1 (square)
- 4:3 (standard)

#### 4. Response Structure

**Create Video Response:**
```json
{
  "object": "video.generation.job",
  "id": "task_01GYHPM...",
  "status": "queued",
  "created_at": 1750510587,
  "finished_at": null,
  "expires_at": null,
  "generations": [],
  "prompt": "A rocket landing on mars",
  "model": "sora-1-turbo",
  "n_variants": 1,
  "n_seconds": 5,
  "height": 1080,
  "width": 1080,
  "failure_reason": null
}
```

**Job Statuses:**
- `queued` - Job waiting for processing
- `in_progress` (or `running`) - Job currently generating
- `succeeded` (or `completed`) - Job finished successfully
- `failed` - Job failed with error
- `cancelled` - Job was cancelled

**Get Status Response:**
Same structure as create response, with updated status and populated `generations` array on completion.

**Download Content Response:**
Binary video file (MP4 format)

#### 5. Features to Implement

1. **Idempotency Support**
   - `Idempotency-Key` header for safe retries
   - Prevents duplicate job creation

2. **Retry Logic with Exponential Backoff**
   - Retry on network errors
   - Retry on 5xx server errors
   - Do NOT retry on 4xx client errors (except 429 rate limits)

3. **Job Lifecycle Management**
   - Create job (async)
   - Poll for status
   - Retrieve completed video
   - Optional: Cancel in-progress jobs

4. **Input Validation**
   - Duration: 1 ≤ n_seconds ≤ 20
   - Resolution: Total pixels ≤ 1080p (e.g., 1920×1080 = 2,073,600 pixels)
   - Model: Must be "sora-1-turbo"
   - Prompt: Required, non-empty string

5. **Error Handling**
   - Content policy violations
   - Invalid parameters (400)
   - Rate limits (429)
   - Server errors (500-503)
   - Job failures with failure_reason

6. **Observability**
   - Structured logging for all API calls
   - Request/response logging with timing
   - Error tracking and categorization
   - Job status transition logging

---

### ❌ Out of Scope (Explicitly Excluded)

#### 1. Sora v2 Features

The following Sora 2 capabilities are **NOT** included in this migration:

**Audio Generation:**
- No audio track generation
- No background sounds, music, or speech
- Videos will be silent
- Rationale: sora-1-turbo does not support audio

**Remix Capabilities:**
- No `remix_video_id` parameter
- No video-to-video transformation
- No iterative refinement of existing videos
- Rationale: Remix is a Sora 2 feature

**Storyboards:**
- No multi-scene scripting
- No structured scene transitions
- Single prompt → single video only
- Rationale: Not supported in Sora v1 API

**Relaxed Queue Mode:**
- No `queue: "relaxed"` parameter
- No unlimited generation mode
- Standard priority queue only
- Rationale: Queue modes are Sora 2 subscription features

**Advanced Audio Features:**
- No custom audio upload
- No audio language selection
- No synchronized dialogue
- Rationale: Not available in v1

**Video-to-Video Input:**
- No arbitrary video file uploads as input
- No video extension capabilities
- Image input only (if supported)
- Rationale: Limited in v1, complex to implement

**Higher Resolutions:**
- No 4K support
- Max resolution: 1080p
- Rationale: v1 limitation

**Sora 2 Models:**
- No `sora-2` model
- No `sora-2-pro` model
- Only `sora-1-turbo` supported
- Rationale: Focusing on v1 API only

#### 2. Advanced Features (Future Enhancements)

The following features are deferred to future epics:

- Webhook support for job completion notifications
- Background polling service (may implement later)
- Files API integration for image uploads
- Image-to-video generation
- Multiple image interpolation (2 images → transition video)
- Real-time streaming generation
- Video preview/thumbnail generation
- Batch optimization strategies
- Cost estimation UI
- Progress percentage tracking (if not provided by API)

---

## Constraints and Limitations

### API Constraints

1. **Duration Limits:**
   - Minimum: 1 second
   - Maximum: 20 seconds
   - Default: Likely 5 seconds (if unspecified)

2. **Resolution Limits:**
   - Maximum: 1080p (1920×1080 pixels)
   - Common resolutions: 720p, 1080p
   - Must match supported aspect ratios

3. **Concurrency Limits:**
   - Standard users: 2 concurrent jobs
   - Pro users: Up to 5 concurrent jobs
   - Exceeding limit: Jobs queued or rejected

4. **Rate Limits:**
   - Requests per minute: TBD (unknown, likely low)
   - Polling frequency: Recommended 10-20 seconds between polls
   - Status endpoint: Subject to rate limits

5. **Video Expiration:**
   - Generated videos expire after ~24 hours
   - Must download promptly after completion
   - Download URLs are short-lived (~1 hour in some cases)

6. **Variants Limit:**
   - High resolution (1080p): 1 variant only
   - Lower resolutions: Up to 4 variants
   - Tradeoff: More variants = lower max resolution

### Content Policy Constraints

1. **Disallowed Content:**
   - Real people's likenesses (celebrities, politicians)
   - Copyrighted characters (Disney, Marvel, etc.)
   - Trademarked logos and brands
   - Adult/sexual content
   - Graphic violence or gore
   - Illegal activities
   - Hate speech or harassment

2. **Content Moderation:**
   - Automatic pre-generation filtering
   - Prompt text analysis
   - Input image analysis (if used)
   - Post-generation content check
   - Rejection via error response (400)

3. **Watermarking:**
   - All videos include visible, moving watermark
   - C2PA metadata embedded
   - Watermark cannot be removed
   - Indicates AI-generated content

### Technical Constraints

1. **No Official SDK Support:**
   - Using raw HTTP/Axios instead of OpenAI SDK
   - Manual endpoint construction
   - Custom error handling required
   - May migrate to SDK when video support is added

2. **Asynchronous Processing:**
   - All jobs are async (fire-and-forget)
   - Client must poll for completion
   - No synchronous video generation
   - Completion time: ~30 seconds to several minutes

3. **No Real-Time Feedback:**
   - No progress percentage (in most cases)
   - Binary status: queued, in_progress, completed, failed
   - Cannot estimate time to completion accurately

4. **Video Format:**
   - Output: MP4 format (assumed)
   - Codec: H.264 (assumed)
   - No format selection
   - Silent audio track (no audio)

---

## Migration Strategy

### Phase 1: Foundation (This Epic)

1. Update SoraClient to use v1 endpoints
2. Update request/response types for v1 schema
3. Remove v2-only features (audio, remix, etc.)
4. Add idempotency support
5. Implement proper input validation
6. Update error handling for v1 error codes
7. Update integration tests
8. Update documentation

### Phase 2: Production Hardening (Future)

1. Add webhook support (if available)
2. Implement background polling service
3. Add comprehensive monitoring/observability
4. Implement cost tracking
5. Add caching for duplicate requests

### Phase 3: Advanced Features (Future)

1. Files API integration for image inputs
2. Image-to-video generation
3. Batch processing optimizations
4. Migration to official OpenAI SDK (when available)

---

## Success Criteria

This epic is considered successful when:

1. ✅ All API calls use v1 endpoints (`/v1/videos`, etc.)
2. ✅ Model is fixed to `sora-1-turbo`
3. ✅ No v2-only features remain in codebase
4. ✅ Input validation enforces v1 constraints (1-20s, ≤1080p)
5. ✅ Idempotency keys are supported and used
6. ✅ Retry logic handles transient errors properly
7. ✅ Error handling covers all v1 error scenarios
8. ✅ Integration tests pass with real or mock v1 API
9. ✅ Documentation accurately reflects v1 API
10. ✅ No 404 errors from incorrect endpoints
11. ✅ Videos can be created, monitored, and downloaded successfully

---

## Acceptance Criteria

- [ ] Written one-pager added to epic root ✅ (this document)
- [ ] Team alignment on scope and exclusions ✅
- [ ] All stakeholders aware of v2 feature removals ✅
- [ ] Clear migration path defined ✅
- [ ] Constraints documented and understood ✅

---

## References

1. **Primary Documentation:**
   - `documentation/sora-api-v1.md` - Comprehensive Sora v1 API guide
   - `docs/SORA-INTEGRATION-RECOMMENDATIONS.md` - Integration recommendations
   - `docs/SORA-API-UPDATE.md` - API update notes

2. **User Stories:**
   - See `STORY-INDEX.md` for all 14 user stories (US-201 through US-214)

3. **External Resources:**
   - OpenAI API Reference: https://platform.openai.com/docs/api-reference
   - Azure Sora Documentation: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/video-generation

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-17 | 1.0 | Initial scope document | Claude Code |

---

**Approved By:** Development Team
**Next Step:** Proceed with US-202 (Update Documentation)
