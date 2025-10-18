# User Story: US-012 - Integration & E2E Testing

## Story Description
**As a** developer
**I want** comprehensive integration and E2E tests
**So that** I can ensure all components work together correctly and catch bugs early

## Acceptance Criteria
- [ ] Integration tests for all API endpoints
- [ ] E2E test scenarios (happy path and error cases)
- [ ] Mock Sora API responses
- [ ] Test fixtures and helpers
- [ ] CI/CD test configuration
- [ ] Test data factories
- [ ] Test cleanup utilities
- [ ] Performance benchmarks

## Story Points
5

## Priority
Must Have (P0)

## Dependencies
- All previous user stories (US-001 through US-011)

## Technical Notes
- Use Jest for test framework
- Use Fastify inject for integration tests
- Use nock for HTTP mocking
- Create reusable test helpers
- Ensure tests are isolated and repeatable
- Set up GitHub Actions for CI/CD

---

## Test Structure

```
tests/
├── unit/                           # Unit tests (already created in previous stories)
│   ├── config/
│   ├── utils/
│   ├── middleware/
│   ├── services/
│   ├── repositories/
│   └── models/
├── integration/                    # Integration tests
│   ├── routes/
│   │   ├── video.routes.integration.test.ts
│   │   ├── health.routes.integration.test.ts
│   ├── services/
│   │   ├── VideoService.integration.test.ts
│   │   ├── BatchService.integration.test.ts
│   ├── clients/
│   │   └── SoraClient.integration.test.ts
│   └── swagger.integration.test.ts
├── e2e/                            # End-to-end tests
│   ├── scenarios/
│   │   ├── create-single-video.e2e.test.ts
│   │   ├── create-batch-videos.e2e.test.ts
│   │   ├── check-job-status.e2e.test.ts
│   │   ├── get-video-result.e2e.test.ts
│   │   ├── cancel-job.e2e.test.ts
│   │   ├── list-jobs.e2e.test.ts
│   │   ├── error-handling.e2e.test.ts
│   │   └── authentication.e2e.test.ts
│   ├── helpers/
│   │   ├── testServer.ts
│   │   ├── testData.ts
│   │   ├── assertions.ts
│   │   └── mockSora.ts
├── fixtures/
│   ├── jobs.fixture.ts
│   ├── soraResponses.fixture.ts
│   ├── requests.fixture.ts
│   └── errors.fixture.ts
└── performance/                    # Performance tests
    ├── load.test.ts
    └── stress.test.ts
```

---

## E2E Test Scenarios

### 1. Complete Video Generation Workflow
```typescript
// tests/e2e/scenarios/create-single-video.e2e.test.ts

describe('E2E: Complete Video Generation Workflow', () => {
  let app: FastifyInstance;
  let mockSora: MockSoraServer;

  beforeAll(async () => {
    app = await createTestServer();
    mockSora = new MockSoraServer();
    mockSora.start();
  });

  afterAll(async () => {
    mockSora.stop();
    await closeTestServer(app);
  });

  it('should create, process, and complete a video', async () => {
    // Step 1: Create video
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': process.env.API_KEY,
      },
      payload: {
        prompt: 'A beautiful sunset over the ocean',
        duration: 10,
        resolution: '1080p',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const { jobId } = createResponse.json().data;
    expect(jobId).toBeDefined();

    // Step 2: Check initial status (should be pending or processing)
    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(statusResponse.statusCode).toBe(200);
    const job = statusResponse.json().data;
    expect(['pending', 'processing']).toContain(job.status);

    // Step 3: Mock Sora completion
    mockSora.completeJob(job.soraJobId, {
      videoUrl: 'https://example.com/video.mp4',
      duration: 10,
      width: 1920,
      height: 1080,
    });

    // Step 4: Wait for processing (or manually sync in test)
    await app.inject({
      method: 'GET',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    // Step 5: Get video result
    const resultResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/videos/${jobId}/result`,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(resultResponse.statusCode).toBe(200);
    const result = resultResponse.json().data;
    expect(result.status).toBe('completed');
    expect(result.result).toBeDefined();
    expect(result.result.videoUrl).toBe('https://example.com/video.mp4');
  });
});
```

### 2. Batch Processing Workflow
```typescript
// tests/e2e/scenarios/create-batch-videos.e2e.test.ts

describe('E2E: Batch Video Generation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(app);
  });

  it('should create and process a batch of videos', async () => {
    // Create batch
    const batchResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/videos/batch',
      headers: {
        'x-api-key': process.env.API_KEY,
      },
      payload: {
        videos: [
          { prompt: 'Sunset', duration: 10 },
          { prompt: 'Mountains', duration: 15 },
          { prompt: 'Ocean', duration: 12 },
        ],
        batchName: 'Nature scenes',
      },
    });

    expect(batchResponse.statusCode).toBe(201);
    const { batchId, jobIds } = batchResponse.json().data;
    expect(jobIds).toHaveLength(3);

    // Check each job status
    for (const jobId of jobIds) {
      const jobResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/videos/${jobId}`,
        headers: {
          'x-api-key': process.env.API_KEY,
        },
      });

      expect(jobResponse.statusCode).toBe(200);
      expect(jobResponse.json().data.id).toBe(jobId);
    }
  });
});
```

### 3. Error Handling Scenarios
```typescript
// tests/e2e/scenarios/error-handling.e2e.test.ts

describe('E2E: Error Handling', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(app);
  });

  it('should handle missing API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      payload: {
        prompt: 'Test',
      },
      // No x-api-key header
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should handle invalid video parameters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': process.env.API_KEY,
      },
      payload: {
        prompt: '', // Empty prompt
        duration: 100, // Invalid duration
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle non-existent job', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/videos/non-existent-id',
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should handle getting result of incomplete job', async () => {
    // Create job
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': process.env.API_KEY,
      },
      payload: {
        prompt: 'Test video',
      },
    });

    const { jobId } = createResponse.json().data;

    // Try to get result immediately (job not completed)
    const resultResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/videos/${jobId}/result`,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(resultResponse.statusCode).toBe(400);
    const body = resultResponse.json();
    expect(body.error.message).toContain('not completed');
  });
});
```

### 4. Job Cancellation
```typescript
// tests/e2e/scenarios/cancel-job.e2e.test.ts

describe('E2E: Job Cancellation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestServer();
  });

  afterAll(async () => {
    await closeTestServer(app);
  });

  it('should cancel an in-progress job', async () => {
    // Create job
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': process.env.API_KEY,
      },
      payload: {
        prompt: 'Test video to cancel',
      },
    });

    const { jobId } = createResponse.json().data;

    // Cancel job
    const cancelResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(cancelResponse.statusCode).toBe(200);
    const body = cancelResponse.json();
    expect(body.data.status).toBe('cancelled');

    // Verify status
    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(statusResponse.json().data.status).toBe('cancelled');
  });

  it('should not cancel completed job', async () => {
    // Create and complete a job
    // (implementation details...)

    // Try to cancel
    const cancelResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    });

    expect(cancelResponse.statusCode).toBe(409);
    expect(cancelResponse.json().error.code).toBe('CONFLICT');
  });
});
```

---

## Test Helpers

### Test Server Factory
```typescript
// tests/e2e/helpers/testServer.ts

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';
import { resetJobRepository } from '../../../src/repositories';
import { resetVideoService } from '../../../src/services';

export async function createTestServer(): Promise<FastifyInstance> {
  // Reset singletons
  resetJobRepository();
  resetVideoService();

  // Build app
  const app = await buildApp();
  await app.ready();

  return app;
}

export async function closeTestServer(app: FastifyInstance): Promise<void> {
  await app.close();
}
```

### Test Data Factory
```typescript
// tests/e2e/helpers/testData.ts

import { CreateVideoRequest } from '../../../src/models/dto/video.dto';

export function createTestVideoRequest(
  overrides?: Partial<CreateVideoRequest>
): CreateVideoRequest {
  return {
    prompt: 'Test video prompt',
    duration: 10,
    resolution: '720p',
    aspectRatio: '16:9',
    fps: 30,
    ...overrides,
  };
}

export function createTestBatchRequest(count: number = 3) {
  return {
    videos: Array.from({ length: count }, (_, i) => ({
      prompt: `Test video ${i + 1}`,
      duration: 10 + i * 5,
    })),
    batchName: 'Test batch',
  };
}
```

### Custom Assertions
```typescript
// tests/e2e/helpers/assertions.ts

export function expectValidJob(job: any) {
  expect(job).toHaveProperty('id');
  expect(job).toHaveProperty('status');
  expect(job).toHaveProperty('prompt');
  expect(job).toHaveProperty('createdAt');
  expect(job).toHaveProperty('updatedAt');
}

export function expectSuccessResponse(response: any, statusCode: number = 200) {
  expect(response.statusCode).toBe(statusCode);
  const body = response.json();
  expect(body).toHaveProperty('success', true);
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('timestamp');
}

export function expectErrorResponse(
  response: any,
  statusCode: number,
  errorCode: string
) {
  expect(response.statusCode).toBe(statusCode);
  const body = response.json();
  expect(body).toHaveProperty('error');
  expect(body.error.code).toBe(errorCode);
  expect(body.error.statusCode).toBe(statusCode);
}
```

### Mock Sora Server
```typescript
// tests/e2e/helpers/mockSora.ts

import nock from 'nock';
import { SoraResponse, SoraStatus } from '../../../src/types/sora';

export class MockSoraServer {
  private baseUrl: string;
  private jobs: Map<string, SoraResponse>;

  constructor() {
    this.baseUrl = process.env.OPENAI_SORA_BASE_URL || 'https://api.openai.com/v1/sora';
    this.jobs = new Map();
  }

  start() {
    nock.cleanAll();
    this.setupInterceptors();
  }

  stop() {
    nock.cleanAll();
  }

  private setupInterceptors() {
    // Mock create video
    nock(this.baseUrl)
      .post('/videos')
      .reply(200, (uri, body: any) => {
        const response: SoraResponse = {
          id: `sora-${Date.now()}`,
          status: SoraStatus.QUEUED,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.jobs.set(response.id, response);
        return response;
      })
      .persist();

    // Mock get status
    nock(this.baseUrl)
      .get(/\/videos\/.*/)
      .reply(200, (uri) => {
        const jobId = uri.split('/').pop();
        return this.jobs.get(jobId!) || { error: 'Not found' };
      })
      .persist();

    // Mock cancel
    nock(this.baseUrl)
      .delete(/\/videos\/.*/)
      .reply(200, (uri) => {
        const jobId = uri.split('/').pop();
        const job = this.jobs.get(jobId!);
        if (job) {
          job.status = SoraStatus.CANCELLED;
        }
        return {};
      })
      .persist();
  }

  completeJob(soraJobId: string, metadata: any) {
    const job = this.jobs.get(soraJobId);
    if (job) {
      job.status = SoraStatus.SUCCEEDED;
      job.videoUrl = metadata.videoUrl;
      job.metadata = metadata;
      job.updatedAt = new Date().toISOString();
    }
  }

  failJob(soraJobId: string, error: any) {
    const job = this.jobs.get(soraJobId);
    if (job) {
      job.status = SoraStatus.FAILED;
      job.error = error;
      job.updatedAt = new Date().toISOString();
    }
  }
}
```

---

## CI/CD Configuration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml

name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm test -- tests/unit

      - name: Run integration tests
        run: npm test -- tests/integration

      - name: Run E2E tests
        run: npm test -- tests/e2e
        env:
          NODE_ENV: test
          API_KEY: test-api-key-for-ci
          OPENAI_API_KEY: test-openai-key

      - name: Run coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Check coverage thresholds
        run: npm run test:coverage -- --coverageThreshold='{"global":{"branches":70,"functions":70,"lines":70,"statements":70}}'
```

### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## Definition of Done

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted
- [ ] No TypeScript errors
- [ ] All helpers documented

### Testing
- [ ] Integration tests for all routes
- [ ] E2E tests for all workflows
- [ ] Error scenario tests
- [ ] Authentication tests
- [ ] Performance benchmarks
- [ ] All tests passing
- [ ] Overall coverage >= 70%
- [ ] Critical paths >= 90% coverage

### CI/CD
- [ ] GitHub Actions workflow configured
- [ ] Tests run on push and PR
- [ ] Coverage uploaded to Codecov
- [ ] Badge added to README
- [ ] Build status visible

### Documentation
- [ ] All test helpers documented
- [ ] Create /docs/US-012-testing-guide.md
- [ ] Test structure documented
- [ ] Running tests documented
- [ ] CI/CD setup documented

### Fixtures & Mocks
- [ ] Test fixtures created
- [ ] Mock Sora server working
- [ ] Test data factories created
- [ ] Custom assertions working

---

## Verification Steps

1. **Run All Tests**
   ```bash
   npm test
   # All tests should pass
   ```

2. **Run E2E Tests**
   ```bash
   npm run test:e2e
   # E2E scenarios should pass
   ```

3. **Check Coverage**
   ```bash
   npm run test:coverage
   # Coverage should be >= 70%
   ```

4. **Run CI Locally**
   ```bash
   npm run test:ci
   # Should pass like in CI
   ```

5. **Test in Clean Environment**
   ```bash
   rm -rf node_modules
   npm install
   npm test
   # Should pass in fresh install
   ```

---

## Notes for Developers

- Always write tests for new features
- Keep tests isolated and repeatable
- Use test helpers for common operations
- Mock external dependencies
- Clean up test data after each test
- Run tests before committing
- Maintain test coverage >= 70%
- Fix flaky tests immediately
- Use descriptive test names
- Group related tests with describe blocks

## Related Documentation

- `/docs/US-012-testing-guide.md` (to be created)
- Jest Documentation: https://jestjs.io/
- Fastify Testing: https://www.fastify.io/docs/latest/Guides/Testing/
- Nock Documentation: https://github.com/nock/nock
