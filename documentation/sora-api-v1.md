# Sora v1 API Integration Guide

**Model:** sora-1-turbo
**Base URL:** https://api.openai.com/v1
**Authentication:** Bearer Token
**Last Updated:** October 17, 2025

---

## Overview

Sora v1 (`sora-1-turbo`) is OpenAI's original text-to-video generation model. It converts natural language prompts into realistic video clips up to 20 seconds long at resolutions up to 1080p. Videos are **silent** (no audio generation).

**Key Features:**
- Text-to-video generation
- Duration: 1-20 seconds
- Resolution: Up to 1080p (1920×1080)
- Multiple variants (1-4 depending on resolution)
- Asynchronous job-based workflow

**Limitations:**
- No audio generation (videos are silent)
- No video-to-video transformation
- No remix capabilities
- Videos expire after ~24 hours

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [Create Video](#create-video)
   - [Get Video Status](#get-video-status)
   - [Download Video](#download-video)
   - [Cancel Video](#cancel-video-optional)
3. [Request Parameters](#request-parameters)
4. [Response Formats](#response-formats)
5. [Job Lifecycle](#job-lifecycle)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)

---

## Authentication

All API requests require authentication via Bearer token.

**Header:**
```
Authorization: Bearer YOUR_OPENAI_API_KEY
Content-Type: application/json
```

**Environment Setup:**
```bash
export OPENAI_API_KEY="sk-..."
```

**Security Note:** Never expose API keys in client-side code or public repositories.

---

## Endpoints

### Create Video

Creates a new video generation job.

**Endpoint:** `POST /v1/videos`

**Request Body:**
```json
{
  "model": "sora-1-turbo",
  "prompt": "A rocket landing on Mars, dust blowing, cinematic lighting",
  "n_seconds": 5,
  "width": 1080,
  "height": 1080,
  "n_variants": 1
}
```

**Response:** `201 Created`
```json
{
  "object": "video.generation.job",
  "id": "task_01GYHPMABCDXYZ",
  "status": "queued",
  "created_at": 1750510587,
  "finished_at": null,
  "expires_at": null,
  "generations": [],
  "prompt": "A rocket landing on Mars, dust blowing, cinematic lighting",
  "model": "sora-1-turbo",
  "n_variants": 1,
  "n_seconds": 5,
  "height": 1080,
  "width": 1080,
  "failure_reason": null
}
```

---

### Get Video Status

Retrieves the current status of a video generation job.

**Endpoint:** `GET /v1/videos/{video_id}`

**Response:** `200 OK`
```json
{
  "object": "video.generation.job",
  "id": "task_01GYHPMABCDXYZ",
  "status": "completed",
  "created_at": 1750510587,
  "finished_at": 1750510647,
  "expires_at": 1750597047,
  "generations": [
    {
      "id": "gen_abc123",
      "video_url": "https://api.openai.com/v1/videos/task_01GYHPMABCDXYZ/content"
    }
  ],
  "prompt": "A rocket landing on Mars, dust blowing, cinematic lighting",
  "model": "sora-1-turbo",
  "n_variants": 1,
  "n_seconds": 5,
  "height": 1080,
  "width": 1080,
  "failure_reason": null
}
```

---

### Download Video

Downloads the generated video file.

**Endpoint:** `GET /v1/videos/{video_id}/content`

**Response:** `200 OK`
- **Content-Type:** `video/mp4`
- **Body:** Binary video file (MP4 format)

**Example:**
```bash
curl https://api.openai.com/v1/videos/task_01GYHPMABCDXYZ/content \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  --output video.mp4
```

**Important:** Download and save videos promptly. They expire after ~24 hours.

---

### Cancel Video (Optional)

Cancels an in-progress video generation job.

**Endpoint:** `DELETE /v1/videos/{video_id}`

**Response:** `200 OK` or `204 No Content`

**Note:** Once cancelled, the job cannot be resumed and no video will be generated.

---

## Request Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | Must be `"sora-1-turbo"` |
| `prompt` | string | Natural language description of the video |

### Optional Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `n_seconds` | integer | 1-20 | ~5 | Video duration in seconds |
| `width` | integer | - | 1080 | Video width in pixels |
| `height` | integer | - | 1080 | Video height in pixels |
| `n_variants` | integer | 1-4 | 1 | Number of video variations |

### Supported Resolutions

| Resolution | Aspect Ratio | Description |
|------------|--------------|-------------|
| 1920×1080 | 16:9 | Full HD landscape |
| 1080×1920 | 9:16 | Full HD portrait |
| 1280×720 | 16:9 | HD landscape |
| 720×1280 | 9:16 | HD portrait |
| 1080×1080 | 1:1 | Square |

**Constraint:** Total pixels must not exceed 1080p (2,073,600 pixels).

### Variants vs. Resolution

- **1080p:** Maximum 1 variant
- **720p:** Up to 2-4 variants (depends on system load)
- **Lower resolutions:** Up to 4 variants

---

## Response Formats

### Job Object

```typescript
interface VideoJob {
  object: "video.generation.job";
  id: string;                    // Job ID (e.g., "task_01GYHPM...")
  status: JobStatus;             // Current job status
  created_at: number;            // Unix timestamp
  finished_at: number | null;    // Unix timestamp (when completed)
  expires_at: number | null;     // Unix timestamp (video expiration)
  generations: Generation[];     // Array of generated videos
  prompt: string;                // Original prompt
  model: string;                 // Model used ("sora-1-turbo")
  n_variants: number;            // Number of variants requested
  n_seconds: number;             // Duration in seconds
  height: number;                // Video height
  width: number;                 // Video width
  failure_reason: string | null; // Error message (if failed)
}

type JobStatus =
  | "queued"        // Waiting to start
  | "in_progress"   // Currently generating
  | "completed"     // Successfully finished
  | "failed"        // Generation failed
  | "cancelled";    // Job was cancelled

interface Generation {
  id: string;       // Generation ID
  video_url: string; // URL to download video
}
```

### Error Response

```json
{
  "error": {
    "message": "The input prompt violates OpenAI's service policies",
    "type": "content_policy_violation",
    "code": "content_filtered"
  }
}
```

---

## Job Lifecycle

### 1. Create Job

```
POST /v1/videos
↓
Status: "queued"
Job ID: task_01GYHPM...
```

### 2. Processing

```
Job queued (waiting for resources)
↓
Status: "in_progress" (generation underway)
↓
Duration: 30 seconds to several minutes
```

### 3. Poll for Completion

```
GET /v1/videos/{id}
↓
Poll every 10-20 seconds
↓
Status transitions: queued → in_progress → completed
```

### 4. Download Video

```
GET /v1/videos/{id}/content
↓
Save to file
↓
Video expires in ~24 hours
```

### Workflow Diagram

```
User Request
    ↓
Create Video (POST) → Job ID
    ↓
[Poll Status (GET)]  ← Repeat every 10-20s
    ↓
Status = "completed"?
    ↓ Yes
Download Video (GET) → MP4 File
    ↓
Save to Storage
```

---

## Error Handling

### Common Error Codes

| HTTP Code | Error Type | Description | Action |
|-----------|------------|-------------|--------|
| 400 | `invalid_request_error` | Invalid parameters | Fix request and retry |
| 400 | `content_filtered` | Prompt violates policies | Revise prompt |
| 401 | `authentication_error` | Invalid API key | Check API key |
| 429 | `rate_limit_exceeded` | Too many requests | Retry with backoff |
| 500 | `server_error` | OpenAI server issue | Retry with backoff |
| 503 | `service_unavailable` | Service overloaded | Retry later |

### Content Policy Violations

**Error Response:**
```json
{
  "error": {
    "message": "The input prompt violates OpenAI's service policies",
    "type": "content_policy_violation",
    "code": "content_filtered"
  }
}
```

**Common Violations:**
- Real people (celebrities, politicians)
- Copyrighted characters (Disney, Marvel, etc.)
- Trademarked logos or brands
- Adult/sexual content
- Graphic violence or gore
- Illegal activities
- Hate speech

**Solution:** Revise the prompt to use generic descriptions. For example:
- ❌ "Elsa from Frozen"
- ✅ "A young ice princess in a blue dress"

### Job Failures

If a job fails after starting:

**Status Response:**
```json
{
  "status": "failed",
  "failure_reason": "Internal generation error"
}
```

**Actions:**
1. Check `failure_reason` for details
2. Retry the request (may be transient)
3. If persistent, revise prompt or parameters

### Retry Strategy

**Retryable Errors:**
- 429 (Rate Limit Exceeded)
- 500 (Server Error)
- 503 (Service Unavailable)
- Network timeouts

**Non-Retryable Errors:**
- 400 (Invalid Request)
- 401 (Authentication)
- 403 (Forbidden)
- Content policy violations

**Exponential Backoff:**
```
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
Max: 3-5 retries
```

### Idempotency

Use the `Idempotency-Key` header to safely retry requests:

```bash
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-12345" \
  -d '{
    "model": "sora-1-turbo",
    "prompt": "A serene sunset"
  }'
```

If the request times out, retry with the **same** `Idempotency-Key`. The server will return the original job instead of creating a duplicate.

---

## Code Examples

### Python

```python
import requests
import time

API_KEY = "sk-..."
BASE_URL = "https://api.openai.com/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 1. Create video job
response = requests.post(
    f"{BASE_URL}/videos",
    headers=headers,
    json={
        "model": "sora-1-turbo",
        "prompt": "A rocket landing on Mars, dust blowing, cinematic lighting",
        "n_seconds": 5,
        "width": 1080,
        "height": 1080
    }
)

job = response.json()
job_id = job["id"]
print(f"Job created: {job_id}, Status: {job['status']}")

# 2. Poll for completion
while True:
    response = requests.get(f"{BASE_URL}/videos/{job_id}", headers=headers)
    job = response.json()
    status = job["status"]
    print(f"Status: {status}")

    if status == "completed":
        print("Video ready!")
        break
    elif status == "failed":
        print(f"Failed: {job['failure_reason']}")
        break

    time.sleep(10)  # Wait 10 seconds

# 3. Download video
response = requests.get(f"{BASE_URL}/videos/{job_id}/content", headers=headers)
with open("output.mp4", "wb") as f:
    f.write(response.content)

print("Video saved to output.mp4")
```

### Node.js (TypeScript)

```typescript
import axios from 'axios';

const API_KEY = process.env.OPENAI_API_KEY!;
const BASE_URL = 'https://api.openai.com/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function generateVideo() {
  // 1. Create video job
  const createResponse = await client.post('/videos', {
    model: 'sora-1-turbo',
    prompt: 'A rocket landing on Mars, dust blowing, cinematic lighting',
    n_seconds: 5,
    width: 1080,
    height: 1080
  });

  const jobId = createResponse.data.id;
  console.log(`Job created: ${jobId}`);

  // 2. Poll for completion
  let status = 'queued';
  while (status === 'queued' || status === 'in_progress') {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

    const statusResponse = await client.get(`/videos/${jobId}`);
    status = statusResponse.data.status;
    console.log(`Status: ${status}`);
  }

  if (status !== 'completed') {
    throw new Error(`Job failed: ${statusResponse.data.failure_reason}`);
  }

  // 3. Download video
  const videoResponse = await client.get(`/videos/${jobId}/content`, {
    responseType: 'arraybuffer'
  });

  const fs = require('fs');
  fs.writeFileSync('output.mp4', videoResponse.data);
  console.log('Video saved to output.mp4');
}

generateVideo();
```

### cURL

```bash
# 1. Create video job
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-1-turbo",
    "prompt": "A rocket landing on Mars",
    "n_seconds": 5,
    "width": 1080,
    "height": 1080
  }'

# Response:
# {"id": "task_01GYHPM...", "status": "queued", ...}

# 2. Check status
curl https://api.openai.com/v1/videos/task_01GYHPM... \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 3. Download video (when status = "completed")
curl https://api.openai.com/v1/videos/task_01GYHPM.../content \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  --output video.mp4
```

---

## Best Practices

### 1. Prompt Engineering

**Be Specific and Descriptive:**
- ✅ "A wide-angle shot of a rocket landing on Mars, red dust swirling, cinematic lighting, 4K quality"
- ❌ "Mars rocket"

**Include:**
- Subject (what)
- Action (doing what)
- Setting (where)
- Style (how it looks)
- Camera angles

**Avoid:**
- Real people names
- Copyrighted characters
- Trademarked brands
- Disallowed content

### 2. Resource Management

**Start Small:**
- Test with 4-5 second videos at 720p
- Scale up to 1080p and longer durations after validation

**Monitor Costs:**
- Longer videos = higher costs
- Higher resolution = higher costs
- Multiple variants = multiplied costs

**Handle Expiration:**
- Download videos immediately after completion
- Videos expire in ~24 hours
- Store in your own cloud storage for long-term access

### 3. Polling Strategy

**Recommended Interval:**
- 10-20 seconds between status checks
- Avoid polling too frequently (rate limits)

**Exponential Backoff:**
```
Poll 1: +10s
Poll 2: +15s
Poll 3: +20s
Poll 4: +30s
Max interval: 60s
```

**Timeout:**
- Set a maximum wait time (e.g., 5-10 minutes)
- Cancel job if it exceeds timeout

### 4. Error Handling

**Always Check Status:**
```javascript
if (response.data.status === 'failed') {
  console.error(`Job failed: ${response.data.failure_reason}`);
  // Handle failure
}
```

**Implement Retries:**
- Use exponential backoff
- Use idempotency keys
- Limit retry attempts (3-5 max)

**Log All Requests:**
- Log job IDs for support inquiries
- Log errors with context
- Monitor success/failure rates

### 5. Content Compliance

**Pre-Validate Prompts:**
- Filter disallowed keywords before sending
- Use OpenAI's moderation API if needed
- Educate users on content policies

**Handle Watermarks:**
- All videos include visible watermarks
- Do not remove or obscure watermarks
- Watermarks indicate AI-generated content

### 6. Security

**Protect API Keys:**
- Never expose keys in client-side code
- Use environment variables
- Rotate keys periodically

**Secure Webhook Endpoints (if used):**
- Verify webhook signatures
- Use HTTPS only
- Implement rate limiting

---

## Rate Limits and Quotas

### Concurrent Jobs

| Tier | Concurrent Jobs |
|------|----------------|
| Standard | 2 |
| Pro | 5 |

**Behavior:**
- New requests are queued if limit reached
- Some requests may be rejected with 429 error

### Request Rate Limits

**Unknown/Not Published:**
- Exact limits not publicly documented
- Conservative estimate: ~10-20 requests/minute
- Use exponential backoff on 429 errors

### Video Generation Quotas

**Pricing/Quotas TBD:**
- As of October 2025, pricing not yet published for API access
- Subscription-based access (ChatGPT Plus/Pro) has monthly limits
- API access will likely be pay-per-use when available

**Expected Cost Factors:**
- Video duration (seconds)
- Resolution (720p vs 1080p)
- Number of variants

---

## FAQs

### Q: Can I generate videos with audio?

**A:** No. Sora v1 (`sora-1-turbo`) does not support audio generation. All videos are silent. If you need audio, add it in post-processing or wait for Sora v2 API support.

### Q: How long does video generation take?

**A:** Typically 30 seconds to 2-3 minutes for short videos (5-10 seconds). Longer videos (15-20 seconds) or higher resolutions may take longer. Actual time depends on system load.

### Q: Can I use my own images or videos as input?

**A:** Image-to-video is supported in Sora v1 but requires using the Files API to upload images. This is an advanced feature and may be added in a future release. Video-to-video is not supported in v1.

### Q: What happens if I cancel a job?

**A:** The job stops immediately, status becomes "cancelled", and no video is generated. You cannot resume a cancelled job.

### Q: Can I generate realistic people in videos?

**A:** No. Real people's likenesses (celebrities, politicians, identifiable individuals) are blocked by content policy. Generic human characters are allowed.

### Q: How do I avoid content policy violations?

**A:** Use generic, descriptive prompts. Avoid:
- Real people names
- Copyrighted characters (Disney, Marvel, etc.)
- Trademarked brands
- Adult content, violence, illegal activities

### Q: Why did my job fail?

**A:** Check `failure_reason` in the response. Common causes:
- Content policy violation
- Invalid parameters
- Internal generation error (transient)

Retry with revised prompt or parameters.

---

## Additional Resources

- **OpenAI Platform Documentation:** https://platform.openai.com/docs
- **API Reference:** https://platform.openai.com/docs/api-reference
- **Usage Policies:** https://openai.com/policies/usage-policies
- **Content Policy:** https://openai.com/policies/content-policy

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-17 | 2.0 | Cleaned up for Sora v1 only. Removed Azure, Sora 2 features. |
| 2025-10-18 | 1.0 | Initial comprehensive guide (mixed v1/v2 content). |

---

**Document Status:** ✅ Updated for SORA-002 Epic (Sora v1 Only)
