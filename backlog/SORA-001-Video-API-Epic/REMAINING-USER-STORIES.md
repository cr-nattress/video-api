# Remaining User Stories (US-009 through US-012) - Summary

This document contains comprehensive outlines for the remaining user stories. Each can be expanded into full README.md files following the same format as US-001 through US-008.

---

## US-009: Batch Processing Service

### Story Description
**As a** developer
**I want** a batch processing service for handling multiple video requests
**So that** users can efficiently generate multiple videos in one operation

### Acceptance Criteria
- [ ] createBatch method implemented
- [ ] processBatch method with parallel processing
- [ ] getBatchStatus method
- [ ] Handle partial failures gracefully
- [ ] Progress tracking for batches
- [ ] Batch cancellation support
- [ ] Batch metadata management

### Story Points: 5
### Priority: Must Have (P0)
### Dependencies: US-006, US-007, US-008

### Key Implementation Files
```
src/services/BatchService.ts
src/services/interfaces/IBatchService.ts
src/models/dto/batch.dto.ts
src/types/batch.ts
tests/unit/services/BatchService.test.ts
tests/integration/services/BatchService.integration.test.ts
```

### Core Methods
1. **createBatch(request: BatchVideoRequest): Promise<BatchResult>**
   - Validates batch request (1-10 videos)
   - Creates jobs for each video
   - Returns batch ID and job IDs
   - Stores batch metadata

2. **processBatch(batchId: string): Promise<void>**
   - Processes videos in parallel (configurable concurrency)
   - Handles individual job failures
   - Updates batch progress
   - Completes when all jobs finish

3. **getBatchStatus(batchId: string): Promise<BatchStatus>**
   - Returns overall batch status
   - Includes individual job statuses
   - Calculates progress percentage
   - Shows completed/failed/pending counts

4. **cancelBatch(batchId: string): Promise<void>**
   - Cancels all in-progress jobs
   - Updates batch status to cancelled
   - Returns cancellation summary

### Batch Status Model
```typescript
interface Batch {
  id: string;
  name?: string;
  jobIds: string[];
  status: BatchStatus; // 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    percentage: number;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

### Testing Requirements
- Test batch creation with 1-10 videos
- Test parallel processing
- Test partial failure scenarios
- Test batch cancellation
- Test progress tracking
- Test concurrent batch operations

### Documentation: `/docs/US-009-batch-service-guide.md`

---

## US-010: Video API Endpoints

### Story Description
**As an** API consumer
**I want** RESTful endpoints for video operations
**So that** I can integrate video generation into my applications

### Acceptance Criteria
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

### Story Points: 8
### Priority: Must Have (P0)
### Dependencies: US-003, US-004, US-008, US-009

### API Endpoints

#### 1. Create Video
```
POST /api/v1/videos
Headers: x-api-key: <api-key>
Body: CreateVideoRequest
Response: 201 Created { success: true, data: { jobId, status, message } }
```

#### 2. Create Batch
```
POST /api/v1/videos/batch
Headers: x-api-key: <api-key>
Body: BatchVideoRequest
Response: 201 Created { success: true, data: { batchId, jobIds, total } }
```

#### 3. Get Job Status
```
GET /api/v1/videos/:jobId
Headers: x-api-key: <api-key>
Response: 200 OK { success: true, data: Job }
```

#### 4. Get Video Result
```
GET /api/v1/videos/:jobId/result
Headers: x-api-key: <api-key>
Response: 200 OK { success: true, data: Job (with result) }
Error: 400 Bad Request if not completed
```

#### 5. Cancel Job
```
DELETE /api/v1/videos/:jobId
Headers: x-api-key: <api-key>
Response: 200 OK { success: true, data: { jobId, status: 'cancelled' } }
```

#### 6. List Jobs
```
GET /api/v1/videos?page=1&limit=20&status=completed
Headers: x-api-key: <api-key>
Response: 200 OK { success: true, data: Job[], pagination: {...} }
```

### Controller Structure
```
src/controllers/VideoController.ts
- createVideo(request, reply)
- createBatch(request, reply)
- getJobStatus(request, reply)
- getVideoResult(request, reply)
- cancelJob(request, reply)
- listJobs(request, reply)
```

### Route Registration
```
src/routes/video.routes.ts
- Register all video endpoints
- Apply authentication middleware
- Configure rate limiting
- Add Swagger schemas
```

### Swagger Configuration
Each endpoint includes:
- Complete request/response schemas
- Example requests and responses
- Error response documentation
- Security requirements
- Tags for organization

### Testing Requirements
- Unit tests for controllers
- Integration tests for each endpoint
- Test authentication
- Test validation
- Test error responses
- Test pagination
- Test filtering

### Documentation: `/docs/US-010-api-endpoints-guide.md`

---

## US-011: Health Check & Monitoring Endpoints

### Story Description
**As a** DevOps engineer
**I want** health check and monitoring endpoints
**So that** I can monitor API health and readiness

### Acceptance Criteria
- [ ] GET /health - Basic health check
- [ ] GET /ready - Readiness probe
- [ ] GET /metrics - Basic metrics
- [ ] System status checks
- [ ] Dependency health checks
- [ ] Performance metrics
- [ ] No authentication required for health endpoints

### Story Points: 2
### Priority: Must Have (P0)
### Dependencies: US-001, US-002

### Health Endpoints

#### 1. Health Check
```
GET /health
Response: 200 OK
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### 2. Readiness Probe
```
GET /ready
Response: 200 OK (if ready) or 503 Service Unavailable
{
  "ready": true,
  "checks": {
    "repository": "healthy",
    "soraClient": "healthy"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Metrics
```
GET /metrics
Response: 200 OK
{
  "jobs": {
    "total": 1000,
    "pending": 50,
    "processing": 20,
    "completed": 900,
    "failed": 25,
    "cancelled": 5
  },
  "api": {
    "requests": 5000,
    "errors": 25
  },
  "system": {
    "uptime": 86400,
    "memory": {
      "used": 256000000,
      "total": 512000000
    }
  }
}
```

### Implementation Files
```
src/controllers/HealthController.ts
src/routes/health.routes.ts
src/services/HealthService.ts
tests/integration/health.test.ts
```

### Health Checks
1. **Repository Health**: Check if repository is accessible
2. **Sora Client Health**: Ping Sora API
3. **Memory Health**: Check memory usage
4. **Uptime**: Track server uptime

### Testing Requirements
- Test /health endpoint
- Test /ready with healthy dependencies
- Test /ready with unhealthy dependencies
- Test /metrics accuracy
- Test response times

### Documentation: `/docs/US-011-health-monitoring-guide.md`

---

## US-012: Integration & E2E Testing

### Story Description
**As a** developer
**I want** comprehensive integration and E2E tests
**So that** I can ensure all components work together correctly

### Acceptance Criteria
- [ ] Integration tests for all API endpoints
- [ ] E2E test scenarios (happy path)
- [ ] E2E error scenarios
- [ ] Mock Sora API responses
- [ ] Test fixtures and helpers
- [ ] CI/CD test configuration
- [ ] Test data factories
- [ ] Test cleanup utilities

### Story Points: 5
### Priority: Must Have (P0)
### Dependencies: All previous user stories

### Test Structure
```
tests/
├── integration/
│   ├── routes/
│   │   ├── video.routes.integration.test.ts
│   │   ├── health.routes.integration.test.ts
│   ├── services/
│   │   ├── VideoService.integration.test.ts
│   │   ├── BatchService.integration.test.ts
│   ├── clients/
│   │   └── SoraClient.integration.test.ts
├── e2e/
│   ├── scenarios/
│   │   ├── create-single-video.e2e.test.ts
│   │   ├── create-batch-videos.e2e.test.ts
│   │   ├── cancel-job.e2e.test.ts
│   │   ├── error-handling.e2e.test.ts
│   ├── helpers/
│   │   ├── testServer.ts
│   │   ├── testData.ts
│   │   ├── assertions.ts
├── fixtures/
│   ├── jobs.fixture.ts
│   ├── soraResponses.fixture.ts
│   ├── requests.fixture.ts
```

### Key Test Scenarios

#### Happy Path Tests
1. **Create and Complete Video**
   - Create video request
   - Poll status until completed
   - Retrieve video result
   - Verify all data correct

2. **Batch Processing**
   - Create batch with 5 videos
   - Monitor batch progress
   - Verify all jobs complete
   - Check batch statistics

3. **Job Cancellation**
   - Create video request
   - Cancel while processing
   - Verify status updated
   - Verify Sora API called

#### Error Scenario Tests
1. **Invalid Request Handling**
   - Test missing required fields
   - Test invalid parameters
   - Verify error responses

2. **Not Found Handling**
   - Test non-existent job ID
   - Verify 404 responses

3. **Authentication Failures**
   - Test missing API key
   - Test invalid API key
   - Verify 401 responses

4. **Rate Limiting**
   - Exceed rate limit
   - Verify 429 response
   - Check retry-after header

### Test Helpers

#### Test Server Factory
```typescript
export async function createTestServer(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function closeTestServer(app: FastifyInstance): Promise<void> {
  await app.close();
}
```

#### Test Data Factory
```typescript
export function createTestVideoRequest(overrides?: Partial<CreateVideoRequest>): CreateVideoRequest {
  return {
    prompt: 'Test video prompt',
    duration: 10,
    resolution: '720p',
    ...overrides,
  };
}

export function createTestJob(overrides?: Partial<Job>): Job {
  return createJob('Test prompt', JobPriority.NORMAL, overrides);
}
```

#### Mock Sora Server
```typescript
export class MockSoraServer {
  private server: any;

  start(): void {
    // Setup nock or express server to mock Sora API
  }

  stop(): void {
    // Cleanup mocks
  }

  mockCreateVideo(response: SoraResponse): void {
    // Mock create endpoint
  }

  mockGetStatus(jobId: string, response: SoraResponse): void {
    // Mock status endpoint
  }
}
```

### CI/CD Configuration

#### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

### Coverage Requirements
- Overall: >= 70%
- Services: >= 80%
- Controllers: >= 75%
- Repositories: >= 85%
- Utilities: >= 80%

### Testing Requirements
- All integration tests pass
- All E2E tests pass
- No flaky tests
- Tests run in < 30 seconds
- Mock Sora API properly
- Clean up test data
- Isolated test cases

### Documentation: `/docs/US-012-testing-guide.md`

---

## Implementation Order

1. **US-009: Batch Processing Service**
   - Extends video service
   - Adds batch management
   - ~2 days

2. **US-010: Video API Endpoints**
   - Controllers and routes
   - Swagger documentation
   - ~3 days

3. **US-011: Health Check & Monitoring**
   - Health endpoints
   - Quick win
   - ~1 day

4. **US-012: Integration & E2E Testing**
   - Comprehensive test suite
   - CI/CD setup
   - ~2-3 days

---

## Notes

Each user story should follow the same comprehensive format as US-001 through US-008:
1. Story Description
2. Acceptance Criteria
3. Story Points & Priority
4. Dependencies
5. Technical Notes
6. Task Prompts (10-15 detailed tasks)
7. Definition of Done Checklist
8. Verification Steps
9. Notes for Developers
10. Related Documentation

All user stories include:
- Comprehensive code examples
- Testing requirements
- Documentation requirements
- Linting and formatting tasks
- Integration verification
