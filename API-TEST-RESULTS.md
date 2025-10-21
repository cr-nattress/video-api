# OpenAI Sora API Test Results
**Date:** October 21, 2025
**Tested Against:** https://api.openai.com/v1/videos

---

## Critical Findings

### 1. Model Names

**❌ DOES NOT EXIST:**
- `sora-1-turbo` - Returns error: "Invalid value: 'sora-1-turbo'. Supported values are: 'sora-2' and 'sora-2-pro'."

**✅ SUPPORTED MODELS:**
- `sora-2`
- `sora-2-pro`

### 2. Request Parameters

**❌ NOT SUPPORTED (Sora 1 format):**
```json
{
  "model": "sora-1-turbo",
  "width": 1080,
  "height": 1080,
  "n_seconds": 5,
  "n_variants": 1
}
```
**Error:** `"Unknown parameter: 'width'"`

**✅ SUPPORTED (Sora 2 format):**
```json
{
  "model": "sora-2",
  "prompt": "A calico cat playing a piano on stage",
  "size": "720x1280",
  "seconds": "8"
}
```

### 3. Supported Size Values

**Valid `size` parameter values:**
- `720x1280` (portrait)
- `1280x720` (landscape)
- `1024x1792` (vertical)
- `1792x1024` (horizontal)

**Invalid:**
- `1080x1080` (square) - Not supported

**Note:** `size` is a STRING in format "WIDTHxHEIGHT"

### 4. Response Format

**Actual Sora 2 Response:**
```json
{
  "id": "video_68f6fc4041688190a4c620f15c37907b0cdf0b22c52ca4b4",
  "object": "video",
  "created_at": 1761016896,
  "status": "queued",
  "completed_at": null,
  "error": null,
  "expires_at": null,
  "model": "sora-2",
  "progress": 0,
  "remixed_from_video_id": null,
  "seconds": "4",
  "size": "720x1280"
}
```

**Key Differences from Documentation:**
- `object` is `"video"` not `"video.generation.job"`
- No `generations` array
- No `n_seconds`, `width`, `height`, `n_variants` fields
- Uses `seconds` (STRING) and `size` (STRING)
- Has `progress` field (0-100)

---

## Test Commands Used

### Test 1: sora-1-turbo (FAILED)
```bash
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-1-turbo",
    "prompt": "A calico cat playing a piano on stage"
  }'
```
**Result:** Error - "Invalid value: 'sora-1-turbo'"

### Test 2: sora-2 minimal (SUCCESS)
```bash
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2",
    "prompt": "A calico cat playing a piano on stage"
  }'
```
**Result:** ✅ Job created with defaults (size: "720x1280", seconds: "4")

### Test 3: sora-2 with size/seconds (PARTIAL SUCCESS)
```bash
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2",
    "prompt": "A calico cat playing a piano on stage",
    "size": "1080x1080",
    "seconds": "8"
  }'
```
**Result:** ❌ Error - "Invalid value: '1080x1080'. Supported values are: '720x1280', '1280x720', '1024x1792', and '1792x1024'."

### Test 4: sora-2 with width/height (FAILED)
```bash
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2",
    "prompt": "A calico cat playing a piano on stage",
    "width": 1080,
    "height": 1080
  }'
```
**Result:** ❌ Error - "Unknown parameter: 'width'"

---

## Conclusions

1. **The `sora-api-v1.md` documentation is INCORRECT**
   - Describes a `sora-1-turbo` model that doesn't exist
   - Uses wrong parameter names (`width`/`height` vs `size`)
   - Uses wrong parameter types (numbers vs strings)
   - Describes wrong response format

2. **The actual API uses Sora 2 format**
   - Model: `sora-2` or `sora-2-pro`
   - Parameters: `size` (string), `seconds` (string)
   - Response: Simple `video` object with `progress` field

3. **SoraV1Client is calling a non-existent API**
   - Hardcoded to use `sora-1-turbo` (doesn't exist)
   - Sends `width`, `height`, `n_seconds`, `n_variants` (not accepted)
   - Expects wrong response format

4. **Required Actions**
   - Update client to use `sora-2` model
   - Change parameter format to `size` and `seconds` strings
   - Update response parsing to handle actual format
   - Fix documentation

---

## Recommended API Client Implementation

```typescript
interface SoraRequest {
  model: 'sora-2' | 'sora-2-pro';
  prompt: string;
  size?: '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
  seconds?: '4' | '8' | '12';
}

interface SoraResponse {
  id: string;
  object: 'video';
  created_at: number;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  completed_at: number | null;
  error: string | null;
  expires_at: number | null;
  model: string;
  progress: number;
  remixed_from_video_id: string | null;
  seconds: string;
  size: string;
}
```

**Correct API Call:**
```typescript
const response = await axios.post('https://api.openai.com/v1/videos', {
  model: 'sora-2',
  prompt: 'A calico cat playing a piano on stage',
  size: '1280x720',
  seconds: '8'
}, {
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```
