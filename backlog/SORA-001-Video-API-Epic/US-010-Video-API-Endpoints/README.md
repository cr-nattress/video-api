# User Story: US-010 - Video API Endpoints

> **Note**: This is the largest user story. Full implementation details available in `../REMAINING-USER-STORIES.md`

## Story Description
**As an** API consumer
**I want** RESTful endpoints for video operations
**So that** I can integrate video generation into my applications

## Acceptance Criteria
- [ ] POST /api/v1/videos - Create single video
- [ ] POST /api/v1/videos/batch - Create batch of videos
- [ ] GET /api/v1/videos/:jobId - Get job status
- [ ] GET /api/v1/videos/:jobId/result - Get video result
- [ ] DELETE /api/v1/videos/:jobId - Cancel job
- [ ] GET /api/v1/videos - List jobs with filtering
- [ ] Request/Response schemas with TypeBox
- [ ] Swagger documentation for each endpoint
- [ ] Authentication on all endpoints
- [ ] Rate limiting configured

## Story Points
8

## Priority
Must Have (P0)

## Dependencies
- US-003 (Error Handling & Middleware)
- US-004 (Swagger Documentation)
- US-008 (Video Generation Service)
- US-009 (Batch Processing Service)

---

## API Specification

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All endpoints require API key in header:
```
x-api-key: your-api-key-here
```

---

## Endpoints

### 1. Create Single Video
```
POST /api/v1/videos
```

**Request Body:**
```json
{
  "prompt": "A serene sunset over the ocean with gentle waves",
  "duration": 15,
  "resolution": "1080p",
  "aspectRatio": "16:9",
  "fps": 30,
  "priority": "normal",
  "metadata": {
    "createdBy": "user123",
    "tags": ["nature", "sunset"]
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "jobId": "abc-123-def-456",
    "status": "pending",
    "message": "Video generation job created successfully"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Create Batch Videos
```
POST /api/v1/videos/batch
```

**Request Body:**
```json
{
  "videos": [
    {
      "prompt": "A sunset over the ocean",
      "duration": 10
    },
    {
      "prompt": "Mountain landscape",
      "duration": 15
    }
  ],
  "batchName": "Nature scenes",
  "metadata": {
    "createdBy": "user123"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-789",
    "jobIds": ["job-1", "job-2"],
    "total": 2,
    "message": "Batch created successfully"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Get Job Status
```
GET /api/v1/videos/:jobId
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "status": "processing",
    "priority": "normal",
    "prompt": "A sunset over the ocean",
    "soraJobId": "sora-456",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:01:00.000Z",
    "startedAt": "2024-01-01T00:00:30.000Z"
  },
  "timestamp": "2024-01-01T00:02:00.000Z"
}
```

### 4. Get Video Result
```
GET /api/v1/videos/:jobId/result
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "status": "completed",
    "prompt": "A sunset over the ocean",
    "result": {
      "videoUrl": "https://example.com/videos/abc-123.mp4",
      "thumbnailUrl": "https://example.com/thumbnails/abc-123.jpg",
      "duration": 10,
      "width": 1920,
      "height": 1080,
      "format": "mp4",
      "fileSize": 10485760
    },
    "completedAt": "2024-01-01T00:05:00.000Z"
  },
  "timestamp": "2024-01-01T00:06:00.000Z"
}
```

**Error (400 Bad Request):**
```json
{
  "error": {
    "message": "Job is not completed yet",
    "code": "BAD_REQUEST",
    "statusCode": 400,
    "context": {
      "status": "processing"
    }
  }
}
```

### 5. Cancel Job
```
DELETE /api/v1/videos/:jobId
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "jobId": "abc-123",
    "status": "cancelled",
    "message": "Job cancelled successfully"
  },
  "timestamp": "2024-01-01T00:02:00.000Z"
}
```

**Error (409 Conflict):**
```json
{
  "error": {
    "message": "Job cannot be cancelled",
    "code": "CONFLICT",
    "statusCode": 409,
    "context": {
      "status": "completed",
      "reason": "Job is not in progress"
    }
  }
}
```

### 6. List Jobs
```
GET /api/v1/videos?page=1&limit=20&status=completed&sortBy=createdAt&order=desc
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (pending, processing, completed, failed, cancelled)
- `sortBy` (optional): Sort field (createdAt, updatedAt, priority)
- `order` (optional): Sort order (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "job-1",
      "status": "completed",
      "prompt": "A sunset",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Implementation Structure

### Controllers
```
src/controllers/VideoController.ts

class VideoController {
  async createVideo(request, reply)
  async createBatch(request, reply)
  async getJobStatus(request, reply)
  async getVideoResult(request, reply)
  async cancelJob(request, reply)
  async listJobs(request, reply)
}
```

### Routes
```
src/routes/video.routes.ts

export async function videoRoutes(app: FastifyInstance) {
  const controller = new VideoController();

  // Register all endpoints
  app.post('/videos', {
    schema: createVideoSchema,
    preHandler: authenticateApiKey
  }, controller.createVideo);

  app.post('/videos/batch', {
    schema: createBatchSchema,
    preHandler: authenticateApiKey
  }, controller.createBatch);

  // ... other routes
}
```

### Schemas
```
src/schemas/video.schemas.ts

export const createVideoSchema = {
  tags: ['videos'],
  description: 'Create a single video generation job',
  body: CreateVideoRequestSchema,
  response: {
    201: CreateVideoResponseSchema,
    400: ErrorSchema,
    401: ErrorSchema,
  },
  security: [{ ApiKeyAuth: [] }],
};
```

---

## Swagger Documentation

Each endpoint includes:
1. **Description**: Clear explanation of endpoint purpose
2. **Tags**: Organized under 'videos' tag
3. **Request Schema**: TypeBox schema with validation
4. **Response Schemas**: Success and error responses
5. **Examples**: Request/response examples
6. **Security**: API key requirement documented

### Example Swagger Entry
```typescript
{
  tags: ['videos'],
  description: 'Create a single video generation job',
  summary: 'Create Video',
  body: CreateVideoRequestSchema,
  response: {
    201: {
      description: 'Video job created successfully',
      ...CreateVideoResponseSchema
    },
    400: {
      description: 'Invalid request',
      ...ErrorSchema
    },
    401: {
      description: 'Unauthorized',
      ...ErrorSchema
    },
  },
  security: [{ ApiKeyAuth: [] }],
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "context": {
      "field": "prompt",
      "reason": "Prompt is required"
    }
  }
}
```

**401 Unauthorized**
```json
{
  "error": {
    "message": "API key is required",
    "code": "UNAUTHORIZED",
    "statusCode": 401
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "message": "Job with identifier 'abc-123' not found",
    "code": "NOT_FOUND",
    "statusCode": 404,
    "context": {
      "resource": "Job",
      "identifier": "abc-123"
    }
  }
}
```

**429 Rate Limit Exceeded**
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429,
    "context": {
      "retryAfter": 60
    }
  }
}
```

---

## Testing

### Unit Tests
```typescript
// tests/unit/controllers/VideoController.test.ts
describe('VideoController', () => {
  it('should create video job', async () => {
    // Mock service
    // Call controller
    // Assert response
  });
});
```

### Integration Tests
```typescript
// tests/integration/routes/video.routes.test.ts
describe('Video Routes', () => {
  it('should create video via POST /api/v1/videos', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: { 'x-api-key': 'test-key' },
      payload: {
        prompt: 'Test video',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.jobId).toBeDefined();
  });
});
```

---

## Definition of Done

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted
- [ ] No TypeScript errors
- [ ] All methods documented

### Testing
- [ ] Unit tests for all controllers
- [ ] Integration tests for all endpoints
- [ ] Test authentication
- [ ] Test validation
- [ ] Test error responses
- [ ] Test pagination
- [ ] All tests passing
- [ ] Coverage >= 70%

### Functionality
- [ ] All 6 endpoints working
- [ ] Authentication working
- [ ] Validation working
- [ ] Error handling working
- [ ] Pagination working
- [ ] Filtering working
- [ ] Sorting working

### Documentation
- [ ] All endpoints documented
- [ ] Swagger UI working
- [ ] Create /docs/US-010-api-endpoints-guide.md
- [ ] API examples included
- [ ] Error responses documented

### Integration
- [ ] Routes registered in app
- [ ] Services integrated
- [ ] Middleware applied
- [ ] Logging integrated

---

## Verification Steps

1. **Test Create Video**
   ```bash
   curl -X POST http://localhost:3000/api/v1/videos \
     -H "x-api-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Test video","duration":10}'
   ```

2. **Test Get Status**
   ```bash
   curl http://localhost:3000/api/v1/videos/abc-123 \
     -H "x-api-key: your-key"
   ```

3. **Test List Jobs**
   ```bash
   curl "http://localhost:3000/api/v1/videos?page=1&limit=10" \
     -H "x-api-key: your-key"
   ```

4. **Verify Swagger**
   ```
   Visit: http://localhost:3000/docs
   Test all endpoints via Swagger UI
   ```

5. **Run Tests**
   ```bash
   npm test tests/integration/routes/video.routes.test.ts
   ```

---

## Notes for Developers

- All endpoints require authentication
- Use TypeBox schemas for validation
- Return consistent response format
- Include pagination metadata
- Use HTTP status codes correctly
- Log all operations
- Handle errors gracefully
- Document all endpoints in Swagger

## Related Documentation

- `/docs/US-010-api-endpoints-guide.md` (to be created)
- For complete implementation: [../REMAINING-USER-STORIES.md](../REMAINING-USER-STORIES.md#us-010-video-api-endpoints)
- Swagger Guide: [../US-004-Swagger-Documentation/README.md](../US-004-Swagger-Documentation/README.md)
