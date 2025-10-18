# User Story: US-007 - Sora API Client

## Story Description
**As a** developer
**I want** a robust Sora API client with retry logic and error handling
**So that** I can reliably communicate with the OpenAI Sora video generation API

## Acceptance Criteria
- [ ] HTTP client configured with axios or undici
- [ ] Authentication handling with API key
- [ ] Create video endpoint implementation
- [ ] Get video status endpoint implementation
- [ ] Cancel video endpoint implementation
- [ ] Retry logic with exponential backoff
- [ ] Request/response logging
- [ ] Timeout handling
- [ ] Error transformation to application errors

## Story Points
5

## Priority
Must Have (P0)

## Dependencies
- US-001 (Project Foundation)
- US-002 (Infrastructure & Logging)
- US-003 (Error Handling & Middleware)
- US-005 (Type Definitions & Models)

## Technical Notes
- Use axios for HTTP client (well-tested, good TypeScript support)
- Implement retry with exponential backoff
- Transform Sora API errors to application errors
- Log all requests/responses at debug level
- Handle rate limiting (429 responses)
- Support request cancellation

---

## Task Prompts

### Task 1: Install HTTP Client Dependencies
```
Install axios and related dependencies:

npm install axios
npm install --save-dev @types/axios

Axios provides:
- Promise-based HTTP client
- Request/response interceptors
- Automatic JSON transformation
- Timeout support
- Cancel token support
```

### Task 2: Create Sora API Client Configuration
```
Create src/clients/sora/config.ts:

/**
 * Sora API client configuration
 */
import { config } from '../../config/index.js';

export interface SoraClientConfig {
  baseURL: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export const soraClientConfig: SoraClientConfig = {
  baseURL: config.openai.soraBaseUrl,
  apiKey: config.openai.apiKey,
  timeout: config.openai.timeout,
  maxRetries: config.openai.maxRetries,
  retryDelay: 1000, // Initial retry delay in ms
};
```

### Task 3: Create Retry Utility
```
Create src/utils/retry.ts:

/**
 * Retry utility with exponential backoff
 */
import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  operationName: string = 'operation'
): Promise<T> {
  const {
    maxRetries,
    initialDelay,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryableErrors = [],
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if max attempts reached
      if (attempt === maxRetries) {
        logger.error(
          { error, attempt, operation: operationName },
          \`\${operationName} failed after \${maxRetries} retries\`
        );
        break;
      }

      // Check if error is retryable
      const isRetryable =
        retryableErrors.length === 0 ||
        retryableErrors.some((code) => error.code === code || error.message?.includes(code));

      if (!isRetryable) {
        logger.warn(
          { error, attempt, operation: operationName },
          \`\${operationName} failed with non-retryable error\`
        );
        break;
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(delay, maxDelay);
      logger.warn(
        { error, attempt, delay: currentDelay, operation: operationName },
        \`\${operationName} failed, retrying in \${currentDelay}ms\`
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      delay *= backoffMultiplier;
    }
  }

  throw lastError!;
}
```

### Task 4: Create Sora API Client
```
Create src/clients/sora/SoraClient.ts:

/**
 * Sora API client
 * Handles communication with OpenAI Sora video generation API
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { soraClientConfig, SoraClientConfig } from './config.js';
import { logger, createLogger } from '../../utils/logger.js';
import { withRetry } from '../../utils/retry.js';
import {
  SoraRequest,
  SoraResponse,
  SoraStatus,
  SoraVideoMetadata,
} from '../../types/sora.js';
import {
  ServiceUnavailableError,
  RateLimitError,
  BadRequestError,
  InternalServerError,
} from '../../middleware/errors/index.js';

export class SoraClient {
  private client: AxiosInstance;
  private config: SoraClientConfig;
  private logger = createLogger('SoraClient');

  constructor(config: SoraClientConfig = soraClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${config.apiKey}\`,
      },
    });

    this.setupInterceptors();
    this.logger.info('Sora API client initialized');
  }

  /**
   * Create a video generation request
   */
  async createVideo(request: SoraRequest): Promise<SoraResponse> {
    this.logger.info({ prompt: request.prompt }, 'Creating video generation request');

    return withRetry(
      async () => {
        try {
          const response = await this.client.post<SoraResponse>('/videos', request);
          this.logger.info({ jobId: response.data.id }, 'Video generation request created');
          return response.data;
        } catch (error) {
          throw this.transformError(error);
        }
      },
      {
        maxRetries: this.config.maxRetries,
        initialDelay: this.config.retryDelay,
        retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'],
      },
      'createVideo'
    );
  }

  /**
   * Get video generation status
   */
  async getVideoStatus(soraJobId: string): Promise<SoraResponse> {
    this.logger.debug({ soraJobId }, 'Fetching video generation status');

    return withRetry(
      async () => {
        try {
          const response = await this.client.get<SoraResponse>(\`/videos/\${soraJobId}\`);
          return response.data;
        } catch (error) {
          throw this.transformError(error);
        }
      },
      {
        maxRetries: this.config.maxRetries,
        initialDelay: this.config.retryDelay,
        retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'],
      },
      'getVideoStatus'
    );
  }

  /**
   * Cancel a video generation request
   */
  async cancelVideo(soraJobId: string): Promise<void> {
    this.logger.info({ soraJobId }, 'Cancelling video generation request');

    return withRetry(
      async () => {
        try {
          await this.client.delete(\`/videos/\${soraJobId}\`);
          this.logger.info({ soraJobId }, 'Video generation request cancelled');
        } catch (error) {
          throw this.transformError(error);
        }
      },
      {
        maxRetries: 2, // Fewer retries for cancel
        initialDelay: this.config.retryDelay,
        retryableErrors: ['ECONNABORTED', 'ETIMEDOUT'],
      },
      'cancelVideo'
    );
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(
          {
            method: config.method,
            url: config.url,
            headers: this.sanitizeHeaders(config.headers),
          },
          'Sora API request'
        );
        return config;
      },
      (error) => {
        this.logger.error({ error }, 'Sora API request error');
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(
          {
            status: response.status,
            statusText: response.statusText,
          },
          'Sora API response'
        );
        return response;
      },
      (error) => {
        this.logger.error(
          {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
          },
          'Sora API response error'
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Transform axios errors to application errors
   */
  private transformError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Rate limiting
      if (axiosError.response?.status === 429) {
        const retryAfter = axiosError.response.headers['retry-after'];
        return new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
      }

      // Bad request
      if (axiosError.response?.status === 400) {
        return new BadRequestError(
          axiosError.response.data?.message || 'Invalid request to Sora API',
          { soraError: axiosError.response.data }
        );
      }

      // Service unavailable
      if (axiosError.response?.status === 503) {
        return new ServiceUnavailableError('Sora API');
      }

      // Timeout
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return new ServiceUnavailableError('Sora API', { reason: 'timeout' });
      }

      // Generic error
      return new InternalServerError(
        \`Sora API error: \${axiosError.message}\`,
        {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        }
      );
    }

    return error instanceof Error ? error : new Error('Unknown error occurred');
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer ***';
    }
    return sanitized;
  }

  /**
   * Health check - ping Sora API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      this.logger.warn({ error }, 'Sora API health check failed');
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let soraClientInstance: SoraClient | null = null;

export function getSoraClient(): SoraClient {
  if (!soraClientInstance) {
    soraClientInstance = new SoraClient();
  }
  return soraClientInstance;
}

export function resetSoraClient(): void {
  soraClientInstance = null;
}
```

### Task 5: Create Mock Sora Client for Testing
```
Create src/clients/sora/MockSoraClient.ts:

/**
 * Mock Sora API client for testing
 */
import { SoraClient } from './SoraClient.js';
import { SoraRequest, SoraResponse, SoraStatus } from '../../types/sora.js';
import { v4 as uuidv4 } from 'uuid';

export class MockSoraClient extends SoraClient {
  private mockDelay: number = 100;
  private shouldFail: boolean = false;
  private mockResponses: Map<string, SoraResponse> = new Map();

  constructor() {
    super();
  }

  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async createVideo(request: SoraRequest): Promise<SoraResponse> {
    await this.delay();

    if (this.shouldFail) {
      throw new Error('Mock Sora API error');
    }

    const response: SoraResponse = {
      id: uuidv4(),
      status: SoraStatus.QUEUED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mockResponses.set(response.id, response);
    return response;
  }

  async getVideoStatus(soraJobId: string): Promise<SoraResponse> {
    await this.delay();

    if (this.shouldFail) {
      throw new Error('Mock Sora API error');
    }

    const response = this.mockResponses.get(soraJobId);
    if (!response) {
      throw new Error('Job not found');
    }

    return response;
  }

  async cancelVideo(soraJobId: string): Promise<void> {
    await this.delay();

    if (this.shouldFail) {
      throw new Error('Mock Sora API error');
    }

    const response = this.mockResponses.get(soraJobId);
    if (response) {
      response.status = SoraStatus.CANCELLED;
    }
  }

  updateMockStatus(soraJobId: string, status: SoraStatus, videoUrl?: string): void {
    const response = this.mockResponses.get(soraJobId);
    if (response) {
      response.status = status;
      response.videoUrl = videoUrl;
      response.updatedAt = new Date().toISOString();
    }
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.mockDelay));
  }
}
```

### Task 6-15: Additional Tasks
```
Task 6: Create Sora Client Tests
- Create tests/unit/clients/SoraClient.test.ts
- Test createVideo, getVideoStatus, cancelVideo
- Test retry logic
- Test error transformation
- Mock axios responses

Task 7: Create Retry Tests
- Create tests/unit/utils/retry.test.ts
- Test successful retry
- Test max retries exceeded
- Test exponential backoff
- Test non-retryable errors

Task 8: Create Integration Tests
- Create tests/integration/clients/SoraClient.integration.test.ts
- Use nock to mock HTTP responses
- Test rate limiting handling
- Test timeout scenarios

Task 9: Add JSDoc Comments
- Document all public methods
- Include usage examples
- Document error cases

Task 10: Export Client
- Create src/clients/index.ts
- Export SoraClient and factory functions

Task 11: Update Configuration
- Add retry configuration to .env.example
- Document Sora API endpoints

Task 12: Create Error Mapping Tests
- Test all HTTP status code mappings
- Verify error context preservation

Task 13: Run Linting and Formatting
npm run lint:fix && npm run format

Task 14: Create Documentation
Create /docs/US-007-sora-client-guide.md with:
- Client initialization
- API method usage
- Retry configuration
- Error handling
- Mock client usage for testing

Task 15: Verify Integration
- Test client with mock Sora API
- Verify retry logic works
- Test timeout handling
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors
- [ ] All methods have JSDoc
- [ ] Sensitive data sanitized in logs

### Testing
- [ ] Unit tests for all client methods
- [ ] Tests for retry logic
- [ ] Tests for error transformation
- [ ] Integration tests with mocked HTTP
- [ ] All tests passing
- [ ] Test coverage >= 70%

### Functionality
- [ ] HTTP client configured
- [ ] Authentication working
- [ ] createVideo endpoint working
- [ ] getVideoStatus endpoint working
- [ ] cancelVideo endpoint working
- [ ] Retry logic with exponential backoff
- [ ] Error transformation to app errors
- [ ] Request/response logging
- [ ] Timeout handling
- [ ] Rate limiting handling

### Documentation
- [ ] All methods documented with JSDoc
- [ ] Create /docs/US-007-sora-client-guide.md
- [ ] Update README.md with client usage
- [ ] Document retry configuration

### Integration
- [ ] Client factory function working
- [ ] Mock client for testing
- [ ] Integration with config
- [ ] Integration with error system
- [ ] Integration with logger

---

## Verification Steps

1. **Test Client Creation**
   ```typescript
   import { getSoraClient } from './clients/sora';
   const client = getSoraClient();
   // Should create instance successfully
   ```

2. **Test Create Video**
   ```typescript
   const response = await client.createVideo({
     prompt: 'A beautiful sunset',
     duration: 10,
   });
   console.log(response.id); // Should have Sora job ID
   ```

3. **Test Retry Logic**
   ```bash
   npm test tests/unit/utils/retry.test.ts
   ```

4. **Test Error Transformation**
   ```bash
   npm test tests/unit/clients/SoraClient.test.ts
   ```

5. **Run All Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

---

## Notes for Developers
- Always use getSoraClient() factory function
- Client handles retries automatically
- Errors are transformed to application errors
- Use MockSoraClient for testing
- API key automatically included in headers
- Requests/responses logged at debug level
- Timeouts configurable via environment
- Rate limiting returns RateLimitError

## Related Documentation
- `/docs/US-007-sora-client-guide.md` (to be created)
- Axios Documentation: https://axios-http.com/
- OpenAI Sora API: https://platform.openai.com/docs/api-reference/sora
