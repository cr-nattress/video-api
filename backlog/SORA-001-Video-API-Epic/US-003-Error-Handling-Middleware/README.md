# User Story: US-003 - Error Handling & Middleware

## Story Description
**As a** developer
**I want** comprehensive error handling and essential middleware
**So that** API errors are handled consistently and requests are properly validated

## Acceptance Criteria
- [ ] Custom error classes created (AppError, ValidationError, NotFoundError, UnauthorizedError)
- [ ] Global error handler middleware implemented
- [ ] Request logging middleware configured
- [ ] Authentication middleware for API key validation
- [ ] Error responses follow consistent format
- [ ] Stack traces only shown in development
- [ ] All errors logged appropriately

## Story Points
3

## Priority
Must Have (P0)

## Dependencies
- US-001 (Project Foundation)
- US-002 (Infrastructure & Logging)

## Technical Notes
- Use Fastify error handling hooks
- Extend Error class for custom errors
- Include error codes and status codes
- Support error context and metadata
- Integrate with Pino logger

---

## Task Prompts

### Task 1: Create Base Error Classes
```
Create src/middleware/errors/AppError.ts with base custom error class:

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        ...(this.context && { context: this.context }),
      },
    };
  }
}
```

### Task 2: Create Specific Error Classes
```
Create src/middleware/errors/index.ts with specific error types:

/**
 * Specific error classes for common scenarios
 */
import { AppError } from './AppError.js';

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, context);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, 404, 'NOT_FOUND', true, { resource, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', context?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', true, context);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', context?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', true, context);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, context);
    this.name = 'ConflictError';
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', true, context);
    this.name = 'BadRequestError';
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_ERROR', true, context);
    this.name = 'InternalServerError';
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, context?: Record<string, unknown>) {
    super(
      `Service ${service} is currently unavailable`,
      503,
      'SERVICE_UNAVAILABLE',
      true,
      { service, ...context }
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      429,
      'RATE_LIMIT_EXCEEDED',
      true,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = 'RateLimitError';
  }
}

// Re-export AppError
export { AppError } from './AppError.js';
```

### Task 3: Create Error Handler Middleware
```
Create src/middleware/errorHandler.ts with global error handling:

/**
 * Global error handler middleware for Fastify
 * Catches all errors and formats consistent responses
 */
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors/index.js';
import { logger } from '../utils/logger.js';
import { isDevelopment } from '../config/index.js';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    context?: Record<string, unknown>;
    stack?: string;
    requestId?: string;
  };
}

/**
 * Global error handler
 */
export async function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = request.id;

  // Handle AppError instances
  if (error instanceof AppError) {
    logger.error({
      err: error,
      requestId,
      url: request.url,
      method: request.method,
      context: error.context,
    }, error.message);

    const response: ErrorResponse = {
      error: {
        message: error.message,
        code: error.errorCode,
        statusCode: error.statusCode,
        requestId,
        ...(error.context && { context: error.context }),
        ...(isDevelopment() && { stack: error.stack }),
      },
    };

    reply.status(error.statusCode).send(response);
    return;
  }

  // Handle Fastify validation errors
  if ('validation' in error) {
    logger.warn({
      err: error,
      requestId,
      url: request.url,
      method: request.method,
      validation: (error as FastifyError).validation,
    }, 'Validation error');

    const response: ErrorResponse = {
      error: {
        message: error.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        requestId,
        context: {
          validation: (error as FastifyError).validation,
        },
        ...(isDevelopment() && { stack: error.stack }),
      },
    };

    reply.status(400).send(response);
    return;
  }

  // Handle all other errors as internal server errors
  logger.error({
    err: error,
    requestId,
    url: request.url,
    method: request.method,
  }, 'Unhandled error');

  const statusCode = (error as FastifyError).statusCode || 500;
  const response: ErrorResponse = {
    error: {
      message: isDevelopment() ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode,
      requestId,
      ...(isDevelopment() && { stack: error.stack }),
    },
  };

  reply.status(statusCode).send(response);
}

/**
 * Not found handler for unmatched routes
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.warn({
    requestId: request.id,
    url: request.url,
    method: request.method,
  }, 'Route not found');

  const response: ErrorResponse = {
    error: {
      message: `Route ${request.method} ${request.url} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
      requestId: request.id,
    },
  };

  reply.status(404).send(response);
}
```

### Task 4: Create Authentication Middleware
```
Create src/middleware/auth.ts for API key validation:

/**
 * Authentication middleware
 * Validates API key from request headers
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from './errors/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Validate API key from request headers
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    logger.warn({
      requestId: request.id,
      url: request.url,
      method: request.method,
    }, 'Missing API key');

    throw new UnauthorizedError('API key is required', {
      header: 'x-api-key',
    });
  }

  if (apiKey !== config.security.apiKey) {
    logger.warn({
      requestId: request.id,
      url: request.url,
      method: request.method,
    }, 'Invalid API key');

    throw new UnauthorizedError('Invalid API key');
  }

  // API key is valid, continue to route handler
  logger.debug({
    requestId: request.id,
    url: request.url,
    method: request.method,
  }, 'API key validated successfully');
}

/**
 * Optional authentication - doesn't throw if no key provided
 * Sets request.user if authentication succeeds
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    return; // No authentication required
  }

  if (apiKey === config.security.apiKey) {
    // Mark request as authenticated
    (request as any).authenticated = true;
  }
}
```

### Task 5: Create Request Logging Middleware
```
Create src/middleware/requestLogger.ts for request/response logging:

/**
 * Request logging middleware
 * Logs all incoming requests and outgoing responses
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';

/**
 * Log request details
 */
export function logRequest(request: FastifyRequest): void {
  logger.info({
    requestId: request.id,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  }, 'Incoming request');
}

/**
 * Log response details
 */
export function logResponse(
  request: FastifyRequest,
  reply: FastifyReply,
  responseTime: number
): void {
  logger.info({
    requestId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime,
  }, `Request completed in ${responseTime}ms`);
}

/**
 * Setup request/response logging hooks
 */
export function setupRequestLogging(app: any): void {
  // Log on request
  app.addHook('onRequest', async (request: FastifyRequest) => {
    request.requestStartTime = Date.now();
    logRequest(request);
  });

  // Log on response
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = Date.now() - (request.requestStartTime || Date.now());
    logResponse(request, reply, responseTime);
  });
}

// Extend FastifyRequest to include requestStartTime
declare module 'fastify' {
  interface FastifyRequest {
    requestStartTime?: number;
    authenticated?: boolean;
  }
}
```

### Task 6: Create Validation Helper Utilities
```
Create src/middleware/validation.ts with validation helpers:

/**
 * Validation helper utilities
 * Provides common validation functions
 */
import { ValidationError } from './errors/index.js';

/**
 * Validate required string field
 */
export function validateRequired(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} is required and must be a non-empty string`, {
      field: fieldName,
    });
  }
  return value;
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  fieldName: string,
  min?: number,
  max?: number
): void {
  if (min !== undefined && value.length < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min} characters long`,
      { field: fieldName, minLength: min, actualLength: value.length }
    );
  }
  if (max !== undefined && value.length > max) {
    throw new ValidationError(
      `${fieldName} must be at most ${max} characters long`,
      { field: fieldName, maxLength: max, actualLength: value.length }
    );
  }
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): void {
  if (min !== undefined && value < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min}`,
      { field: fieldName, min, value }
    );
  }
  if (max !== undefined && value > max) {
    throw new ValidationError(
      `${fieldName} must be at most ${max}`,
      { field: fieldName, max, value }
    );
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T>(
  value: T,
  fieldName: string,
  allowedValues: T[]
): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      { field: fieldName, allowedValues, value }
    );
  }
}

/**
 * Validate array
 */
export function validateArray<T>(
  value: unknown,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, {
      field: fieldName,
    });
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must contain at least ${minLength} items`,
      { field: fieldName, minLength, actualLength: value.length }
    );
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must contain at most ${maxLength} items`,
      { field: fieldName, maxLength, actualLength: value.length }
    );
  }

  return value as T[];
}
```

### Task 7: Update App Configuration
```
Update src/app.ts to register error handlers and middleware:

/**
 * Fastify application setup
 * Configures plugins, routes, middleware, and error handlers
 */
import Fastify, { FastifyInstance } from 'fastify';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { setupRequestLogging } from './middleware/requestLogger.js';

/**
 * Build and configure the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger,
    disableRequestLogging: true, // We use custom request logging
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    genReqId: () => crypto.randomUUID(),
  });

  // Setup request/response logging
  setupRequestLogging(app);

  // Register error handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Health check route (temporary, will be moved to routes in US-011)
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
```

### Task 8: Create Error Handling Tests
```
Create tests/unit/middleware/errors.test.ts:

/**
 * Tests for custom error classes
 */
import { describe, it, expect } from '@jest/globals';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
  InternalServerError,
} from '../../../src/middleware/errors/index';

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR', true, { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual({ key: 'value' });
    });

    it('should convert to JSON format', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      const json = error.toJSON();

      expect(json).toHaveProperty('error');
      expect(json.error.message).toBe('Test error');
      expect(json.error.code).toBe('TEST_ERROR');
      expect(json.error.statusCode).toBe(400);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource name', () => {
      const error = new NotFoundError('Job', '123');

      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.message).toContain('Job');
      expect(error.message).toContain('123');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError('Invalid credentials');

      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid credentials');
    });
  });
});
```

### Task 9: Create Middleware Integration Tests
```
Create tests/integration/middleware/errorHandler.test.ts:

/**
 * Integration tests for error handler middleware
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/app';
import { NotFoundError, ValidationError } from '../../../src/middleware/errors/index';

describe('Error Handler Middleware', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();

    // Add test routes
    app.get('/test/error', async () => {
      throw new Error('Test error');
    });

    app.get('/test/not-found', async () => {
      throw new NotFoundError('TestResource', '123');
    });

    app.get('/test/validation', async () => {
      throw new ValidationError('Invalid data', { field: 'test' });
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle AppError instances', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/not-found',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('TestResource');
  });

  it('should handle ValidationError', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/validation',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle generic errors as 500', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/error',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should handle 404 for unmatched routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
```

### Task 10: Create Authentication Tests
```
Create tests/unit/middleware/auth.test.ts:

/**
 * Tests for authentication middleware
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { FastifyRequest, FastifyReply } from 'fastify';
import { authenticateApiKey } from '../../../src/middleware/auth';
import { UnauthorizedError } from '../../../src/middleware/errors/index';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {
      id: 'test-request-id',
      url: '/test',
      method: 'GET',
      headers: {},
    };
    mockReply = {};
  });

  it('should throw UnauthorizedError when API key is missing', async () => {
    await expect(
      authenticateApiKey(mockRequest as FastifyRequest, mockReply as FastifyReply)
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when API key is invalid', async () => {
    mockRequest.headers = { 'x-api-key': 'invalid-key' };

    await expect(
      authenticateApiKey(mockRequest as FastifyRequest, mockReply as FastifyReply)
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should pass when API key is valid', async () => {
    process.env.API_KEY = 'valid-test-key';
    mockRequest.headers = { 'x-api-key': 'valid-test-key' };

    await expect(
      authenticateApiKey(mockRequest as FastifyRequest, mockReply as FastifyReply)
    ).resolves.not.toThrow();
  });
});
```

### Task 11: Create Validation Helper Tests
```
Create tests/unit/middleware/validation.test.ts:

/**
 * Tests for validation helper utilities
 */
import { describe, it, expect } from '@jest/globals';
import {
  validateRequired,
  validateLength,
  validateRange,
  validateEnum,
  validateArray,
} from '../../../src/middleware/validation';
import { ValidationError } from '../../../src/middleware/errors/index';

describe('Validation Helpers', () => {
  describe('validateRequired', () => {
    it('should pass for valid string', () => {
      expect(validateRequired('test', 'field')).toBe('test');
    });

    it('should throw for empty string', () => {
      expect(() => validateRequired('', 'field')).toThrow(ValidationError);
    });

    it('should throw for non-string', () => {
      expect(() => validateRequired(123, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateLength', () => {
    it('should pass for valid length', () => {
      expect(() => validateLength('test', 'field', 2, 10)).not.toThrow();
    });

    it('should throw for too short', () => {
      expect(() => validateLength('a', 'field', 2)).toThrow(ValidationError);
    });

    it('should throw for too long', () => {
      expect(() => validateLength('toolong', 'field', undefined, 5)).toThrow(ValidationError);
    });
  });

  describe('validateRange', () => {
    it('should pass for valid range', () => {
      expect(() => validateRange(5, 'field', 1, 10)).not.toThrow();
    });

    it('should throw for too small', () => {
      expect(() => validateRange(0, 'field', 1)).toThrow(ValidationError);
    });

    it('should throw for too large', () => {
      expect(() => validateRange(11, 'field', undefined, 10)).toThrow(ValidationError);
    });
  });

  describe('validateEnum', () => {
    it('should pass for valid enum value', () => {
      expect(() => validateEnum('a', 'field', ['a', 'b', 'c'])).not.toThrow();
    });

    it('should throw for invalid enum value', () => {
      expect(() => validateEnum('d', 'field', ['a', 'b', 'c'])).toThrow(ValidationError);
    });
  });

  describe('validateArray', () => {
    it('should pass for valid array', () => {
      const result = validateArray([1, 2, 3], 'field', 1, 5);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should throw for non-array', () => {
      expect(() => validateArray('not-array', 'field')).toThrow(ValidationError);
    });

    it('should throw for too few items', () => {
      expect(() => validateArray([1], 'field', 2)).toThrow(ValidationError);
    });

    it('should throw for too many items', () => {
      expect(() => validateArray([1, 2, 3], 'field', undefined, 2)).toThrow(ValidationError);
    });
  });
});
```

### Task 12: Add JSDoc Comments
```
Ensure all error classes, middleware functions, and utilities have comprehensive JSDoc:
- Document all parameters and return types
- Include @throws tags for functions that throw errors
- Add usage examples for middleware
- Document error response formats
```

### Task 13: Run Linting and Formatting
```
Run the following commands to ensure code quality:

npm run lint:fix
npm run format

Verify no linting errors remain:
npm run lint
npm run format:check
npm run type-check
```

### Task 14: Create Documentation
```
Create /docs/US-003-error-handling-guide.md with:

# Error Handling & Middleware Guide

## Overview
Comprehensive guide to error handling, custom errors, and middleware in the Sora Video API.

## Custom Error Classes

### AppError (Base Class)
All custom errors extend AppError and include:
- statusCode: HTTP status code
- errorCode: Application-specific error code
- context: Additional error context
- isOperational: Whether error is operational (vs programming error)

### Available Error Classes
- ValidationError (400): Input validation failures
- BadRequestError (400): Malformed requests
- UnauthorizedError (401): Authentication failures
- ForbiddenError (403): Authorization failures
- NotFoundError (404): Resource not found
- ConflictError (409): Resource conflicts
- RateLimitError (429): Rate limit exceeded
- InternalServerError (500): Internal errors
- ServiceUnavailableError (503): External service failures

## Usage Examples

### Throwing Errors
\`\`\`typescript
import { NotFoundError, ValidationError } from './middleware/errors';

// Not found
throw new NotFoundError('Job', jobId);

// Validation
throw new ValidationError('Invalid prompt', { field: 'prompt', reason: 'too short' });
\`\`\`

### Error Response Format
\`\`\`json
{
  "error": {
    "message": "Job with identifier '123' not found",
    "code": "NOT_FOUND",
    "statusCode": 404,
    "requestId": "abc-123",
    "context": {
      "resource": "Job",
      "identifier": "123"
    }
  }
}
\`\`\`

## Middleware

### Authentication
Validates x-api-key header on protected routes.

### Request Logging
Automatically logs all requests and responses with timing.

### Error Handler
Catches all errors and formats consistent responses.

## Validation Helpers
Utility functions for common validation scenarios:
- validateRequired(): Required fields
- validateLength(): String length
- validateRange(): Numeric ranges
- validateEnum(): Enum values
- validateArray(): Array validation
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All TypeScript files pass linting (npm run lint)
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors (npm run type-check)
- [ ] All functions have JSDoc comments
- [ ] No console.log statements (use logger)

### Testing
- [ ] Unit tests for all error classes
- [ ] Unit tests for authentication middleware
- [ ] Unit tests for validation helpers
- [ ] Integration tests for error handler
- [ ] All tests passing (npm test)
- [ ] Test coverage >= 70% for middleware modules

### Functionality
- [ ] Custom error classes instantiate correctly
- [ ] Errors include proper status codes and error codes
- [ ] Error handler catches and formats all errors
- [ ] Authentication middleware validates API keys
- [ ] Request logging captures all requests/responses
- [ ] Stack traces only shown in development
- [ ] Error context properly serialized

### Documentation
- [ ] All classes and functions have JSDoc
- [ ] Create /docs/US-003-error-handling-guide.md with:
  - Error class reference
  - Middleware usage examples
  - Error response format documentation
  - Validation helper examples
- [ ] Update README.md if needed

### Integration
- [ ] Error handlers registered in app.ts
- [ ] Request logging hooked into Fastify lifecycle
- [ ] Errors integrate with Pino logger
- [ ] TypeScript types properly exported

---

## Verification Steps

1. **Test Error Classes**
   ```bash
   npm test tests/unit/middleware/errors.test.ts
   # All error class tests should pass
   ```

2. **Test Error Handler Integration**
   ```bash
   npm run dev
   curl http://localhost:3000/non-existent-route
   # Should return 404 with proper error format
   ```

3. **Test Authentication**
   ```bash
   # Without API key
   curl http://localhost:3000/protected-endpoint
   # Should return 401

   # With valid API key
   curl -H "x-api-key: your-key" http://localhost:3000/protected-endpoint
   # Should proceed to route
   ```

4. **Verify Request Logging**
   ```bash
   npm run dev
   # Make several requests
   # Check logs for request/response entries with timing
   ```

5. **Run All Tests**
   ```bash
   npm test
   npm run test:coverage
   # Verify coverage for middleware modules
   ```

---

## Notes for Developers
- Always extend AppError for custom errors
- Include meaningful context in errors
- Never expose sensitive data in error messages
- Use appropriate status codes and error codes
- Authentication middleware should be applied to protected routes only
- Validation should happen as early as possible
- Log all errors but don't duplicate logging

## Related Documentation
- `/docs/US-003-error-handling-guide.md` (to be created)
- Fastify Error Handling: https://www.fastify.io/docs/latest/Reference/Errors/
- HTTP Status Codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
