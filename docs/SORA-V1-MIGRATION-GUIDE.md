# Sora v1 Migration Guide

**Epic:** SORA-002 - Original Sora API Migration
**Version:** 1.0
**Date:** October 18, 2025
**Status:** ✅ Complete

---

## Overview

This guide helps you migrate your video generation API from previous implementations to the **Sora v1 API** (`sora-1-turbo` model). The migration ensures compatibility with OpenAI's officially supported Sora video generation endpoints.

**Key Changes:**
- ✅ Base URL updated to standard OpenAI API
- ✅ Duration limits changed from 5-60s to **1-20s**
- ✅ Model fixed to `sora-1-turbo`
- ✅ 4K resolution removed (max: 1080p)
- ❌ V2 features removed (audio, remix, storyboards)

---

## Table of Contents

1. [What Changed](#what-changed)
2. [Breaking Changes](#breaking-changes)
3. [Migration Steps](#migration-steps)
4. [API Changes](#api-changes)
5. [Code Examples](#code-examples)
6. [Testing Your Migration](#testing-your-migration)
7. [Rollback Plan](#rollback-plan)
8. [FAQ](#faq)

---

## What Changed

### ✅ Updated Components

| Component | Before | After |
|-----------|--------|-------|
| **Base URL** | `https://api.openai.com/v1/sora` | `https://api.openai.com/v1` |
| **Model** | `sora-2`, `sora-2-pro` | `sora-1-turbo` only |
| **Duration** | 5-60 seconds | **1-20 seconds** |
| **Max Resolution** | 4K (3840×2160) | **1080p (1920×1080)** |
| **Endpoints** | `/videos` | `/videos` (same) |
| **Auth** | Bearer token | Bearer token (same) |

### ❌ Removed Features (V2 Only)

The following features are **no longer available** in Sora v1:

- ❌ **Audio generation** - Videos are silent
- ❌ **Remix mode** - No video-to-video transformation
- ❌ **Storyboards** - No multi-scene scripting
- ❌ **Relaxed queue** - Standard priority only
- ❌ **4K resolution** - Max is 1080p

---

## Breaking Changes

### 🚨 Critical: Duration Validation Changed

**Old Behavior (V2):**
```typescript
duration: 5 to 60 seconds  // ✅ Previously valid
```

**New Behavior (V1):**
```typescript
duration: 1 to 20 seconds  // ✅ Now valid
duration: 21 or higher     // ❌ REJECTED
```

**Migration Action:**
```typescript
// Before migration
const request = {
  prompt: "Test video",
  duration: 30  // ❌ Will be REJECTED in v1
};

// After migration
const request = {
  prompt: "Test video",
  duration: 20  // ✅ Maximum allowed in v1
};
```

### 🚨 Critical: 4K Resolution Removed

**Old Behavior (V2):**
```typescript
resolution: '4k'  // ✅ Previously valid
```

**New Behavior (V1):**
```typescript
resolution: '4k'       // ❌ REJECTED - removed from type
resolution: '1080p'    // ✅ Maximum allowed
```

**Migration Action:**
```typescript
// Before migration
const request = {
  prompt: "Test video",
  resolution: '4k'  // ❌ Type error + runtime rejection
};

// After migration
const request = {
  prompt: "Test video",
  resolution: '1080p'  // ✅ Highest quality available
};
```

### 🚨 Model Specification Required

**Old Behavior:**
```typescript
// Model was optional or defaulted to latest
model: 'sora-2'  // ✅ Previously valid
```

**New Behavior:**
```typescript
// Model must be sora-1-turbo
model: 'sora-1-turbo'  // ✅ Required
model: 'sora-2'        // ❌ REJECTED
```

### ⚠️ Audio Features Removed

**Old Behavior (V2):**
```typescript
const request = {
  prompt: "Test video",
  audio: true,           // ✅ Previously available
  audioLanguage: 'en'    // ✅ Previously available
};
```

**New Behavior (V1):**
```typescript
const request = {
  prompt: "Test video"
  // ❌ No audio fields available
  // Videos are always silent in v1
};
```

---

## Migration Steps

### Step 1: Update Configuration

**File:** `.env`

```bash
# Before
OPENAI_SORA_BASE_URL=https://api.openai.com/v1/sora
OPENAI_API_KEY=sk-...

# After
# Remove OPENAI_SORA_BASE_URL (uses standard base URL)
OPENAI_API_KEY=sk-...
```

### Step 2: Update Video Requests

**Before:**
```typescript
import { CreateVideoRequest } from './models/dto/video.dto';

const request: CreateVideoRequest = {
  prompt: "A rocket landing on Mars",
  duration: 30,        // ❌ Too long for v1
  resolution: '4k',    // ❌ Not supported in v1
  priority: 'normal'
};
```

**After:**
```typescript
import { CreateVideoRequest } from './models/dto/video.dto';

const request: CreateVideoRequest = {
  prompt: "A rocket landing on Mars",
  duration: 15,        // ✅ Within v1 limits (1-20s)
  resolution: '1080p', // ✅ Max resolution for v1
  priority: 'normal'
};
```

### Step 3: Remove V2-Only Features

**Before:**
```typescript
const request = {
  prompt: "Test video",
  duration: 10,
  resolution: '1080p',
  audio: true,              // ❌ Remove
  audioLanguage: 'en',      // ❌ Remove
  remixVideoId: 'vid_123',  // ❌ Remove
  queue: 'relaxed'          // ❌ Remove
};
```

**After:**
```typescript
const request = {
  prompt: "Test video",
  duration: 10,
  resolution: '1080p'
  // Audio, remix, and queue features removed
};
```

### Step 4: Update Duration Validation

**File:** `src/services/VideoService.ts`

No changes needed - validation automatically updated to enforce 1-20 second range.

**Verify your requests:**
```typescript
// ✅ Valid durations in v1
duration: 1   // Minimum
duration: 10  // Middle range
duration: 20  // Maximum

// ❌ Invalid durations in v1
duration: 0   // Too short
duration: 21  // Too long
duration: 60  // Way too long (old v2 limit)
```

### Step 5: Test Integration

Run your test suite to ensure all requests are v1-compliant:

```bash
# Run validation tests
npm test -- VideoService.validation.test.ts
npm test -- SoraClient.validation.test.ts

# Run integration tests
npm test -- video.routes.test.ts

# Run end-to-end tests
npm test -- video-workflow.e2e.test.ts
```

---

## API Changes

### Request Format Changes

**Before (Mixed V2 format):**
```json
POST /v1/videos
{
  "model": "sora-2",
  "prompt": "A serene sunset",
  "duration": 30,
  "resolution": "4k",
  "audio": true
}
```

**After (V1 format):**
```json
POST /v1/videos
{
  "model": "sora-1-turbo",
  "prompt": "A serene sunset",
  "n_seconds": 15,
  "width": 1920,
  "height": 1080
}
```

### Response Format (Unchanged)

Response format remains the same:

```json
{
  "object": "video.generation.job",
  "id": "task_01GYHPM...",
  "status": "queued",
  "created_at": 1750510587,
  "finished_at": null,
  "generations": [],
  "prompt": "A serene sunset",
  "model": "sora-1-turbo",
  "n_variants": 1,
  "n_seconds": 15,
  "height": 1080,
  "width": 1920,
  "failure_reason": null
}
```

### Endpoint Changes

**No endpoint changes** - All endpoints remain the same:

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/videos` | POST | Create video | ✅ Same |
| `/v1/videos/{id}` | GET | Get status | ✅ Same |
| `/v1/videos/{id}/content` | GET | Download | ✅ Same |
| `/v1/videos/{id}` | DELETE | Cancel | ✅ Same |

---

## Code Examples

### Example 1: Basic Migration

**Before:**
```typescript
// Old implementation
async function createVideo() {
  const response = await fetch('https://api.openai.com/v1/sora/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sora-2',
      prompt: 'A rocket landing on Mars',
      duration: 30,
      resolution: '4k'
    })
  });
  return response.json();
}
```

**After:**
```typescript
// New v1 implementation
async function createVideo() {
  const response = await fetch('https://api.openai.com/v1/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sora-1-turbo',
      prompt: 'A rocket landing on Mars',
      n_seconds: 15,        // Changed from duration: 30
      width: 1920,          // Changed from resolution: '4k'
      height: 1080
    })
  });
  return response.json();
}
```

### Example 2: Using the API Client

**Before:**
```typescript
import { VideoService } from './services/VideoService';

const request = {
  prompt: "Cinematic ocean sunset",
  duration: 45,
  resolution: '4k',
  audio: true
};

const job = await videoService.createVideo(request);
```

**After:**
```typescript
import { VideoService } from './services/VideoService';

const request = {
  prompt: "Cinematic ocean sunset",
  duration: 20,        // Max 20s in v1
  resolution: '1080p'  // Max 1080p in v1
  // audio removed - not supported in v1
};

const job = await videoService.createVideo(request);
```

### Example 3: Batch Processing

**Before:**
```typescript
const jobs = await Promise.all([
  videoService.createVideo({ prompt: "Video 1", duration: 30 }),
  videoService.createVideo({ prompt: "Video 2", duration: 45 }),
  videoService.createVideo({ prompt: "Video 3", duration: 60 })
]);
```

**After:**
```typescript
const jobs = await Promise.all([
  videoService.createVideo({ prompt: "Video 1", duration: 15 }),
  videoService.createVideo({ prompt: "Video 2", duration: 18 }),
  videoService.createVideo({ prompt: "Video 3", duration: 20 })  // Max 20s
]);
```

---

## Testing Your Migration

### Pre-Migration Checklist

- [ ] Backup your current codebase
- [ ] Document all video generation requests in your application
- [ ] Identify requests with duration > 20 seconds
- [ ] Identify requests using 4K resolution
- [ ] Identify requests using audio features
- [ ] Create test plan for critical workflows

### Validation Tests

```bash
# Run all validation tests
npm test

# Run specific validation tests
npm test -- VideoService.validation.test.ts

# Verify duration limits
# - Test with duration: 1 (minimum)
# - Test with duration: 20 (maximum)
# - Test with duration: 21 (should fail)
# - Test with duration: 60 (old limit, should fail)

# Verify resolution limits
# - Test with resolution: '1080p' (maximum)
# - Test with resolution: '4k' (should fail)

# Verify model enforcement
# - Test with model: 'sora-1-turbo' (valid)
# - Test with model: 'sora-2' (should fail)
```

### Integration Testing

```bash
# Test video creation flow
curl -X POST http://localhost:3000/api/v1/videos \
  -H "x-api-key: test-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene sunset over mountains",
    "duration": 10,
    "resolution": "1080p"
  }'

# Should return 201 Created with job ID
```

### Common Validation Errors

**Error 1: Duration too long**
```json
{
  "error": {
    "message": "Duration must be between 1 and 20 seconds per Sora v1 specification"
  }
}
```
**Fix:** Reduce duration to ≤20 seconds

**Error 2: 4K not supported**
```json
{
  "error": {
    "message": "Resolution must be one of: 480p, 720p, 1080p. 4K is not supported in Sora v1"
  }
}
```
**Fix:** Use 1080p instead

**Error 3: Wrong model**
```json
{
  "error": {
    "message": "Only \"sora-1-turbo\" model is supported in Sora v1"
  }
}
```
**Fix:** Use model: "sora-1-turbo"

---

## Rollback Plan

If you encounter issues after migration, follow this rollback procedure:

### Option 1: Git Rollback

```bash
# Rollback to previous commit
git log --oneline  # Find pre-migration commit
git revert <commit-hash>

# Or reset to previous state
git reset --hard <commit-hash>
```

### Option 2: Feature Flag

Keep both implementations and use a feature flag:

```typescript
const USE_V1_API = process.env.SORA_API_VERSION === 'v1';

if (USE_V1_API) {
  // Use v1 implementation
  const client = new SoraClient();
} else {
  // Use legacy implementation (if available)
  const client = new LegacySoraClient();
}
```

### Option 3: Gradual Migration

Migrate gradually by user segment:

```typescript
function getSoraClient(userId: string) {
  // Migrate 10% of users first
  const migratedUsers = new Set(['user1', 'user2', ...]);

  if (migratedUsers.has(userId)) {
    return new SoraClient();  // v1
  } else {
    return new LegacySoraClient();  // Legacy
  }
}
```

---

## FAQ

### Q: Will my existing videos still work?

**A:** Yes. This migration only affects **new video creation requests**. Existing videos and job IDs remain accessible.

### Q: What happens to videos longer than 20 seconds?

**A:** You have two options:
1. **Split into segments:** Break 60s video into 3×20s segments
2. **Use max duration:** Reduce all requests to 20s maximum

### Q: Can I still use 4K resolution?

**A:** No. Sora v1 maximum resolution is 1080p (1920×1080). Use `resolution: '1080p'` for highest quality.

### Q: How do I add audio to videos?

**A:** Sora v1 does not support audio generation. Videos are silent. Add audio in post-processing using tools like FFmpeg:

```bash
ffmpeg -i silent_video.mp4 -i audio.mp3 -c:v copy -c:a aac output.mp4
```

### Q: What if I need longer videos?

**A:** For videos >20 seconds:
- Create multiple 20s segments
- Stitch them together using video editing tools
- Or wait for Sora v2 API (future support)

### Q: Does this affect pricing?

**A:** Pricing structure may differ between v1 and v2. Consult OpenAI pricing docs for current rates.

### Q: When will Sora v2 API be available?

**A:** Unknown. Monitor OpenAI's API announcements for Sora v2 API availability.

### Q: Can I migrate gradually?

**A:** Yes. Use feature flags or A/B testing to migrate users gradually. See [Rollback Plan](#rollback-plan).

### Q: What if my API key doesn't have Sora access?

**A:** Request access at https://openai.com/waitlist/sora or use `MockSoraClient` for development:

```typescript
import { MockSoraClient } from './clients/MockSoraClient';
const client = new MockSoraClient();  // For testing without API access
```

---

## Additional Resources

- **API Documentation:** [documentation/sora-api-v1.md](../documentation/sora-api-v1.md)
- **Integration Recommendations:** [docs/SORA-INTEGRATION-RECOMMENDATIONS.md](./SORA-INTEGRATION-RECOMMENDATIONS.md)
- **Scope Document:** [backlog/SORA-002-Original-Sora-API-Migration/SCOPE-AND-CONSTRAINTS.md](../backlog/SORA-002-Original-Sora-API-Migration/SCOPE-AND-CONSTRAINTS.md)

---

## Support

If you encounter issues during migration:

1. **Check validation errors:** Review error messages for specific constraint violations
2. **Run test suite:** `npm test` to verify all changes
3. **Review logs:** Check application logs for detailed error context
4. **Open an issue:** Report problems in the project issue tracker

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-18 | 1.0 | Initial migration guide for SORA-002 epic |

---

**Migration Status:** ✅ Ready for Production
**Last Updated:** October 18, 2025
**Epic:** SORA-002 - Original Sora API Migration
