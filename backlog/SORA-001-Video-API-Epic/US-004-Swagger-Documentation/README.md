# User Story: US-004 - Swagger Documentation Setup

## Story Description
**As a** developer
**I want** interactive API documentation with Swagger/OpenAPI
**So that** I can easily explore and test the API endpoints

## Acceptance Criteria
- [ ] @fastify/swagger configured with OpenAPI 3.0
- [ ] @fastify/swagger-ui configured and accessible
- [ ] Common schemas defined (Error, Success, Pagination)
- [ ] Security schemes configured (API Key)
- [ ] Swagger UI accessible at /docs
- [ ] JSON schema available at /docs/json
- [ ] API info and metadata properly set

## Story Points
2

## Priority
Must Have (P0)

## Dependencies
- US-001 (Project Foundation)
- US-002 (Infrastructure & Logging)
- US-003 (Error Handling & Middleware)

## Technical Notes
- Use OpenAPI 3.0 specification
- Leverage TypeBox for schema generation
- Configure security schemes for authentication
- Include examples in schemas
- Group endpoints by tags

---

## Task Prompts

### Task 1: Install Swagger Dependencies
```
Verify the following dependencies are installed (should be from US-001):
- @fastify/swagger@^8.14.0
- @fastify/swagger-ui@^2.1.0
- @fastify/type-provider-typebox@^4.0.0
- @sinclair/typebox@^0.32.0

If not installed, run:
npm install @fastify/swagger @fastify/swagger-ui @fastify/type-provider-typebox @sinclair/typebox
```

### Task 2: Create Common Schema Definitions
```
Create src/schemas/common.ts with reusable TypeBox schemas:

/**
 * Common schema definitions used across the API
 * Uses TypeBox for type-safe schema generation
 */
import { Type, Static } from '@sinclair/typebox';

/**
 * Error response schema
 */
export const ErrorSchema = Type.Object(
  {
    error: Type.Object({
      message: Type.String({ description: 'Error message' }),
      code: Type.String({ description: 'Error code' }),
      statusCode: Type.Integer({ description: 'HTTP status code' }),
      requestId: Type.Optional(Type.String({ description: 'Request ID for tracing' })),
      context: Type.Optional(
        Type.Record(Type.String(), Type.Unknown(), {
          description: 'Additional error context',
        })
      ),
      stack: Type.Optional(Type.String({ description: 'Stack trace (development only)' })),
    }),
  },
  {
    $id: 'Error',
    description: 'Standard error response format',
    examples: [
      {
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
          statusCode: 404,
          requestId: 'abc-123',
        },
      },
    ],
  }
);

export type ErrorResponse = Static<typeof ErrorSchema>;

/**
 * Success response wrapper schema
 */
export const SuccessSchema = <T extends ReturnType<typeof Type.Any>>(dataSchema: T) =>
  Type.Object(
    {
      success: Type.Boolean({ default: true }),
      data: dataSchema,
      timestamp: Type.String({ format: 'date-time' }),
    },
    {
      description: 'Standard success response format',
    }
  );

/**
 * Pagination metadata schema
 */
export const PaginationSchema = Type.Object(
  {
    page: Type.Integer({ minimum: 1, description: 'Current page number' }),
    limit: Type.Integer({ minimum: 1, maximum: 100, description: 'Items per page' }),
    total: Type.Integer({ minimum: 0, description: 'Total number of items' }),
    totalPages: Type.Integer({ minimum: 0, description: 'Total number of pages' }),
    hasNext: Type.Boolean({ description: 'Whether there is a next page' }),
    hasPrev: Type.Boolean({ description: 'Whether there is a previous page' }),
  },
  {
    $id: 'Pagination',
    description: 'Pagination metadata',
  }
);

export type Pagination = Static<typeof PaginationSchema>;

/**
 * Paginated response schema
 */
export const PaginatedResponseSchema = <T extends ReturnType<typeof Type.Any>>(itemSchema: T) =>
  Type.Object(
    {
      success: Type.Boolean({ default: true }),
      data: Type.Array(itemSchema),
      pagination: PaginationSchema,
      timestamp: Type.String({ format: 'date-time' }),
    },
    {
      description: 'Paginated list response format',
    }
  );

/**
 * Health check response schema
 */
export const HealthSchema = Type.Object(
  {
    status: Type.String({ enum: ['ok', 'degraded', 'down'], description: 'Service status' }),
    timestamp: Type.String({ format: 'date-time', description: 'Current server time' }),
    uptime: Type.Optional(Type.Number({ description: 'Server uptime in seconds' })),
    version: Type.Optional(Type.String({ description: 'API version' })),
  },
  {
    $id: 'Health',
    description: 'Health check response',
    examples: [
      {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
      },
    ],
  }
);

export type Health = Static<typeof HealthSchema>;

/**
 * Query parameters for pagination
 */
export const PaginationQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1, description: 'Page number' })),
  limit: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 100, default: 20, description: 'Items per page' })
  ),
});

export type PaginationQuery = Static<typeof PaginationQuerySchema>;
```

### Task 3: Create Swagger Configuration
```
Create src/config/swagger.ts with Swagger/OpenAPI configuration:

/**
 * Swagger/OpenAPI configuration
 * Configures API documentation with OpenAPI 3.0
 */
import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { config } from './index.js';

/**
 * Swagger plugin options
 */
export const swaggerOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'Sora Video Generation API',
      description: 'RESTful API for generating videos using OpenAI Sora',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://${config.server.host}:${config.server.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'health',
        description: 'Health check and monitoring endpoints',
      },
      {
        name: 'videos',
        description: 'Video generation and management',
      },
      {
        name: 'jobs',
        description: 'Job status and management',
      },
      {
        name: 'batch',
        description: 'Batch video generation operations',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'API key for authentication',
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
    externalDocs: {
      description: 'Find more information here',
      url: 'https://github.com/your-org/sora-video-api',
    },
  },
  hideUntagged: false,
  exposeRoute: true,
};

/**
 * Swagger UI options
 */
export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
};

/**
 * Get Swagger JSON endpoint path
 */
export const getSwaggerJsonPath = (): string => {
  return '/docs/json';
};

/**
 * Get Swagger UI endpoint path
 */
export const getSwaggerUiPath = (): string => {
  return '/docs';
};
```

### Task 4: Register Swagger Plugins in App
```
Update src/app.ts to register Swagger plugins:

/**
 * Fastify application setup
 * Configures plugins, routes, middleware, and error handlers
 */
import Fastify, { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { setupRequestLogging } from './middleware/requestLogger.js';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';

/**
 * Build and configure the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger,
    disableRequestLogging: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Setup request/response logging
  setupRequestLogging(app);

  // Register Swagger for API documentation
  await app.register(fastifySwagger, swaggerOptions);
  await app.register(fastifySwaggerUi, swaggerUiOptions);

  // Register error handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Health check route (temporary, will be moved to routes in US-011)
  app.get('/health', {
    schema: {
      tags: ['health'],
      description: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Log Swagger endpoints
  app.addHook('onReady', async () => {
    logger.info('Swagger documentation available at /docs');
    logger.info('OpenAPI JSON available at /docs/json');
  });

  return app;
}
```

### Task 5: Create Schema Utilities
```
Create src/schemas/utils.ts with schema helper utilities:

/**
 * Schema utility functions
 * Helper functions for working with TypeBox schemas
 */
import { Type, TSchema, Static } from '@sinclair/typebox';

/**
 * Create an ID parameter schema
 */
export const IdParamSchema = Type.Object({
  id: Type.String({
    description: 'Resource identifier',
    minLength: 1,
    examples: ['abc-123', 'job-456'],
  }),
});

export type IdParam = Static<typeof IdParamSchema>;

/**
 * Create a UUID parameter schema
 */
export const UuidParamSchema = Type.Object({
  id: Type.String({
    format: 'uuid',
    description: 'Resource UUID',
    examples: ['123e4567-e89b-12d3-a456-426614174000'],
  }),
});

export type UuidParam = Static<typeof UuidParamSchema>;

/**
 * Create an optional query parameter
 */
export function optionalQuery<T extends TSchema>(schema: T) {
  return Type.Optional(schema);
}

/**
 * Create a nullable field
 */
export function nullable<T extends TSchema>(schema: T) {
  return Type.Union([schema, Type.Null()]);
}

/**
 * Create timestamp fields
 */
export const TimestampSchema = Type.Object({
  createdAt: Type.String({ format: 'date-time', description: 'Creation timestamp' }),
  updatedAt: Type.String({ format: 'date-time', description: 'Last update timestamp' }),
});

export type Timestamp = Static<typeof TimestampSchema>;

/**
 * Add examples to a schema
 */
export function withExamples<T extends TSchema>(schema: T, examples: any[]) {
  return Type.Unsafe<Static<T>>({ ...schema, examples });
}

/**
 * Create a string enum schema
 */
export function stringEnum<T extends string[]>(values: [...T], description?: string) {
  return Type.String({
    enum: values,
    description: description || `One of: ${values.join(', ')}`,
  });
}
```

### Task 6: Create Swagger Schema Export
```
Create src/schemas/index.ts to export all schemas:

/**
 * Schema exports
 * Central export point for all API schemas
 */
export * from './common.js';
export * from './utils.js';

// This file will be extended with domain-specific schemas in later user stories
```

### Task 7: Create Swagger Tests
```
Create tests/integration/swagger.test.ts:

/**
 * Integration tests for Swagger documentation
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Swagger Documentation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should serve Swagger UI at /docs', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('swagger-ui');
  });

  it('should serve OpenAPI JSON at /docs/json', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');

    const spec = JSON.parse(response.body);
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Sora Video Generation API');
    expect(spec.info.version).toBe('1.0.0');
  });

  it('should include security schemes in OpenAPI spec', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    const spec = JSON.parse(response.body);
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.ApiKeyAuth).toBeDefined();
    expect(spec.components.securitySchemes.ApiKeyAuth.type).toBe('apiKey');
    expect(spec.components.securitySchemes.ApiKeyAuth.name).toBe('x-api-key');
  });

  it('should include defined tags', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    const spec = JSON.parse(response.body);
    expect(spec.tags).toBeDefined();
    expect(spec.tags.length).toBeGreaterThan(0);

    const tagNames = spec.tags.map((tag: any) => tag.name);
    expect(tagNames).toContain('health');
    expect(tagNames).toContain('videos');
  });

  it('should include health endpoint in spec', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    const spec = JSON.parse(response.body);
    expect(spec.paths['/health']).toBeDefined();
    expect(spec.paths['/health'].get).toBeDefined();
  });

  it('should include server information', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    const spec = JSON.parse(response.body);
    expect(spec.servers).toBeDefined();
    expect(spec.servers.length).toBeGreaterThan(0);
  });
});
```

### Task 8: Create Schema Tests
```
Create tests/unit/schemas/common.test.ts:

/**
 * Tests for common schemas
 */
import { describe, it, expect } from '@jest/globals';
import { Value } from '@sinclair/typebox/value';
import {
  ErrorSchema,
  HealthSchema,
  PaginationSchema,
  PaginationQuerySchema,
} from '../../../src/schemas/common';

describe('Common Schemas', () => {
  describe('ErrorSchema', () => {
    it('should validate valid error response', () => {
      const validError = {
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          statusCode: 400,
          requestId: 'abc-123',
        },
      };

      expect(Value.Check(ErrorSchema, validError)).toBe(true);
    });

    it('should reject invalid error response', () => {
      const invalidError = {
        error: {
          message: 'Test error',
          // missing required fields
        },
      };

      expect(Value.Check(ErrorSchema, invalidError)).toBe(false);
    });
  });

  describe('HealthSchema', () => {
    it('should validate valid health response', () => {
      const validHealth = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
      };

      expect(Value.Check(HealthSchema, validHealth)).toBe(true);
    });

    it('should validate health response with only required fields', () => {
      const minimalHealth = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      expect(Value.Check(HealthSchema, minimalHealth)).toBe(true);
    });
  });

  describe('PaginationSchema', () => {
    it('should validate valid pagination', () => {
      const validPagination = {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      };

      expect(Value.Check(PaginationSchema, validPagination)).toBe(true);
    });

    it('should reject invalid pagination', () => {
      const invalidPagination = {
        page: 0, // page must be >= 1
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      };

      expect(Value.Check(PaginationSchema, invalidPagination)).toBe(false);
    });
  });

  describe('PaginationQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        page: 2,
        limit: 50,
      };

      expect(Value.Check(PaginationQuerySchema, validQuery)).toBe(true);
    });

    it('should accept empty query parameters', () => {
      expect(Value.Check(PaginationQuerySchema, {})).toBe(true);
    });

    it('should reject invalid limit', () => {
      const invalidQuery = {
        page: 1,
        limit: 101, // limit max is 100
      };

      expect(Value.Check(PaginationQuerySchema, invalidQuery)).toBe(false);
    });
  });
});
```

### Task 9: Update Package.json Scripts
```
Add a script to generate OpenAPI spec to package.json:

"scripts": {
  ... existing scripts ...
  "docs:generate": "node -e \"require('./dist/app.js').buildApp().then(app => app.ready().then(() => console.log(JSON.stringify(app.swagger(), null, 2))))\"",
}

Note: This script will work after the project is built. It's useful for generating
static OpenAPI specs for CI/CD or documentation tools.
```

### Task 10: Create Documentation
```
Create /docs/US-004-swagger-guide.md with comprehensive documentation:

# Swagger/OpenAPI Documentation Guide

## Overview
The Sora Video API uses Swagger/OpenAPI 3.0 for interactive API documentation.

## Accessing Documentation

### Swagger UI
Interactive API documentation with Try-it-out functionality:
- URL: http://localhost:3000/docs
- Features:
  - Interactive endpoint testing
  - Request/response examples
  - Schema definitions
  - Authentication testing

### OpenAPI JSON
Raw OpenAPI specification:
- URL: http://localhost:3000/docs/json
- Can be imported into tools like Postman, Insomnia, etc.

## API Information

### Metadata
- Title: Sora Video Generation API
- Version: 1.0.0
- License: MIT

### Servers
- Development: http://localhost:3000
- Production: https://api.example.com

### Tags
Endpoints are organized by tags:
- **health**: Health check and monitoring
- **videos**: Video generation and management
- **jobs**: Job status and management
- **batch**: Batch operations

## Authentication
The API uses API Key authentication:
- Header name: x-api-key
- Type: apiKey
- Location: header

### Testing with Swagger UI
1. Click "Authorize" button
2. Enter your API key
3. Click "Authorize"
4. All subsequent requests will include the key

## Common Schemas

### Error Response
\`\`\`json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "requestId": "abc-123",
    "context": {
      "field": "additional info"
    }
  }
}
\`\`\`

### Success Response
\`\`\`json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### Paginated Response
\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## Using TypeBox Schemas

### Defining a Schema
\`\`\`typescript
import { Type } from '@sinclair/typebox';

const MySchema = Type.Object({
  name: Type.String({ minLength: 1, description: 'Name field' }),
  age: Type.Integer({ minimum: 0, description: 'Age in years' }),
});
\`\`\`

### Using in Routes
\`\`\`typescript
app.post('/endpoint', {
  schema: {
    tags: ['videos'],
    description: 'Create something',
    body: MySchema,
    response: {
      200: SuccessSchema(MySchema),
      400: ErrorSchema,
    },
  },
}, async (request, reply) => {
  // Handler logic
});
\`\`\`

## Best Practices

1. **Always include tags** - Organize endpoints logically
2. **Add descriptions** - Help users understand endpoints
3. **Provide examples** - Show expected request/response formats
4. **Document errors** - Include all possible error responses
5. **Use consistent schemas** - Leverage common schemas
6. **Add security** - Document authentication requirements

## Customization

### Adding New Tags
Edit src/config/swagger.ts:
\`\`\`typescript
tags: [
  {
    name: 'new-tag',
    description: 'Description of new tag',
  },
],
\`\`\`

### Updating API Info
Edit the `info` section in swagger.ts

### Adding Security Schemes
Edit the `securitySchemes` section in swagger.ts
```

### Task 11: Add JSDoc Comments
```
Ensure all schema definitions and configuration have comprehensive JSDoc:
- Document schema purposes and usage
- Include examples in JSDoc
- Document all configuration options
- Add @example tags where helpful
```

### Task 12: Run Linting and Formatting
```
Run the following commands:

npm run lint:fix
npm run format

Verify no errors:
npm run lint
npm run format:check
npm run type-check
```

### Task 13: Verify Swagger Integration
```
Start the development server and verify Swagger works:

npm run dev

Then visit:
- http://localhost:3000/docs (Swagger UI)
- http://localhost:3000/docs/json (OpenAPI JSON)

Verify:
1. Swagger UI loads correctly
2. OpenAPI spec is valid JSON
3. Health endpoint appears in documentation
4. Security schemes are configured
5. Try-it-out functionality works
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors
- [ ] All schemas and configs have JSDoc

### Testing
- [ ] Integration tests for Swagger endpoints
- [ ] Unit tests for common schemas
- [ ] Schema validation tests
- [ ] All tests passing
- [ ] Test coverage >= 70%

### Functionality
- [ ] Swagger UI accessible at /docs
- [ ] OpenAPI JSON accessible at /docs/json
- [ ] Valid OpenAPI 3.0 specification
- [ ] Security schemes configured
- [ ] Common schemas defined and working
- [ ] Tags configured for endpoint organization
- [ ] Server information correct
- [ ] Try-it-out functionality works

### Documentation
- [ ] All schemas documented with JSDoc
- [ ] Create /docs/US-004-swagger-guide.md with:
  - Accessing documentation
  - Authentication setup
  - Common schemas reference
  - TypeBox usage examples
  - Customization guide
- [ ] Update README.md with Swagger URLs

### Integration
- [ ] Swagger plugins registered in app
- [ ] TypeBox type provider configured
- [ ] Common schemas exported
- [ ] Health endpoint includes schema
- [ ] Logging for Swagger endpoints

---

## Verification Steps

1. **Access Swagger UI**
   ```bash
   npm run dev
   # Visit http://localhost:3000/docs in browser
   # Verify UI loads and is interactive
   ```

2. **Verify OpenAPI Spec**
   ```bash
   curl http://localhost:3000/docs/json | jq
   # Should return valid OpenAPI 3.0 JSON
   ```

3. **Test Authentication**
   ```
   In Swagger UI:
   1. Click "Authorize" button
   2. Enter API key
   3. Verify lock icons appear on endpoints
   ```

4. **Test Try-it-out**
   ```
   In Swagger UI:
   1. Navigate to GET /health
   2. Click "Try it out"
   3. Click "Execute"
   4. Verify response appears
   ```

5. **Run Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

6. **Validate OpenAPI Spec**
   ```bash
   # Using online validator
   # Copy JSON from /docs/json
   # Paste into https://editor.swagger.io/
   # Verify no errors
   ```

---

## Notes for Developers
- Swagger UI is served at /docs for easy access
- Use TypeBox schemas for type safety
- Always tag endpoints for organization
- Include examples in schemas for better documentation
- Security schemes apply globally unless overridden
- Swagger spec is generated dynamically from route schemas
- Custom schemas should extend common schemas

## Related Documentation
- `/docs/US-004-swagger-guide.md` (to be created)
- Fastify Swagger: https://github.com/fastify/fastify-swagger
- TypeBox: https://github.com/sinclairzx81/typebox
- OpenAPI 3.0 Spec: https://swagger.io/specification/
