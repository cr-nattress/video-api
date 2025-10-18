# Sora Video Generation API

> Production-ready RESTful API for generating AI-powered videos using OpenAI's Sora model

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.29-black)](https://www.fastify.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Quick Start](#-quick-start)
- [Usage Examples](#-usage-examples)
- [API Documentation](#-api-documentation)
- [Architecture](#-architecture)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The **Sora Video Generation API** is a robust, enterprise-ready service that wraps OpenAI's Sora video generation model in a scalable REST API. Built with TypeScript and Fastify, it provides asynchronous job management, batch processing capabilities, and comprehensive monitoring—all with full type safety and production-grade error handling.

### What Problems Does It Solve?

- **Asynchronous Video Generation**: Long-running video jobs managed with proper job queuing and status tracking
- **Batch Processing**: Generate multiple videos in parallel with progress monitoring
- **Production Ready**: Built-in authentication, rate limiting, structured logging, and error handling
- **Type Safety**: Full TypeScript implementation with validated request/response schemas
- **Developer Experience**: Interactive Swagger documentation, comprehensive examples, and clear error messages

### Who Should Use This?

- Developers integrating AI video generation into applications
- Product teams building video creation platforms
- Startups needing production-ready video API infrastructure
- Enterprises requiring scalable video generation with proper monitoring

---

## ✨ Key Features

- 🎬 **Single & Batch Video Generation** - Create individual videos or process multiple prompts in parallel
- 📊 **Job Management** - Track video generation status with real-time progress updates
- 🔒 **Authentication & Security** - API key authentication with configurable rate limiting
- 📝 **Interactive API Docs** - Auto-generated Swagger UI with live endpoint testing
- 🏗️ **Layered Architecture** - Clean separation of concerns (controllers, services, repositories)
- 🔍 **Structured Logging** - Production-grade logging with Pino for debugging and monitoring
- ⚡ **High Performance** - Built on Fastify, one of the fastest Node.js web frameworks
- 🧪 **Comprehensive Testing** - Unit, integration, and E2E tests with high coverage
- 🎨 **Type-Safe** - Full TypeScript with strict mode, validated schemas, and type inference
- 🐳 **Docker Ready** - Containerization support for easy deployment (coming soon)

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 (comes with Node.js)
- **OpenAI API Key** with Sora access ([Get API Key](https://platform.openai.com/api-keys))

### Installation

```bash
# Clone the repository
git clone https://github.com/cr-nattress/video-api.git
cd video-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Configuration

Edit the `.env` file with your credentials:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# OpenAI Sora Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_SORA_BASE_URL=https://api.openai.com/v1/sora
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3

# API Security
API_KEY=your-secure-api-key-here
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Logging
LOG_LEVEL=info
LOG_PRETTY=true
```

### Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start
```

The API will be available at **http://localhost:3000**

### Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Expected output:
# {"status":"ok","timestamp":"2025-10-18T..."}
```

**🎉 Success!** Visit the interactive API docs at **http://localhost:3000/docs**

---

## 💡 Usage Examples

### Create a Single Video

```bash
curl -X POST http://localhost:3000/api/v1/videos \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "prompt": "A serene sunset over mountains with flying birds",
    "duration": 10,
    "resolution": "1080p",
    "aspectRatio": "16:9",
    "priority": "normal"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123xyz",
    "status": "pending",
    "message": "Video generation job created successfully"
  },
  "requestId": "req-1"
}
```

### Check Job Status

```bash
curl -X GET http://localhost:3000/api/v1/videos/job_abc123xyz \
  -H "x-api-key: your-api-key-here"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job_abc123xyz",
    "status": "processing",
    "prompt": "A serene sunset over mountains...",
    "priority": "normal",
    "createdAt": "2025-10-18T10:30:00.000Z",
    "updatedAt": "2025-10-18T10:30:15.000Z",
    "startedAt": "2025-10-18T10:30:05.000Z"
  }
}
```

### Batch Video Generation

```bash
curl -X POST http://localhost:3000/api/v1/videos/batch \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "name": "Nature Series",
    "videos": [
      {
        "prompt": "Ocean waves at sunset",
        "duration": 10,
        "resolution": "1080p"
      },
      {
        "prompt": "Forest in autumn with falling leaves",
        "duration": 10,
        "resolution": "1080p"
      },
      {
        "prompt": "Northern lights dancing in the sky",
        "duration": 15,
        "resolution": "4k"
      }
    ],
    "priority": "high"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_xyz789",
    "jobIds": ["job_001", "job_002", "job_003"],
    "total": 3,
    "message": "Batch created with 3 videos"
  }
}
```

### Get Video Result

```bash
curl -X GET http://localhost:3000/api/v1/videos/job_abc123xyz/result \
  -H "x-api-key: your-api-key-here"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job_abc123xyz",
    "status": "completed",
    "result": {
      "videoUrl": "https://storage.example.com/videos/abc123.mp4",
      "thumbnailUrl": "https://storage.example.com/thumbnails/abc123.jpg",
      "duration": 10.5,
      "resolution": "1080p",
      "fileSize": 15728640,
      "format": "mp4"
    },
    "completedAt": "2025-10-18T10:35:00.000Z"
  }
}
```

### List Jobs with Filtering

```bash
# Get all completed jobs
curl -X GET "http://localhost:3000/api/v1/videos?status=completed&limit=10" \
  -H "x-api-key: your-api-key-here"

# Get high-priority jobs
curl -X GET "http://localhost:3000/api/v1/videos?priority=high&page=1&limit=20" \
  -H "x-api-key: your-api-key-here"
```

### TypeScript Client Example

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'your-api-key-here';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// Create a video
async function generateVideo(prompt: string) {
  try {
    const response = await client.post('/videos', {
      prompt,
      duration: 10,
      resolution: '1080p',
      aspectRatio: '16:9',
    });

    const { jobId } = response.data.data;
    console.log(`Job created: ${jobId}`);

    // Poll for completion
    const result = await pollJobStatus(jobId);
    console.log('Video ready:', result.videoUrl);

    return result;
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}

// Poll job status until complete
async function pollJobStatus(jobId: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await client.get(`/videos/${jobId}`);
    const job = response.data.data;

    if (job.status === 'completed') {
      const result = await client.get(`/videos/${jobId}/result`);
      return result.data.data.result;
    }

    if (job.status === 'failed') {
      throw new Error(`Job failed: ${job.error}`);
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Job timeout');
}

// Usage
generateVideo('A futuristic city with flying cars');
```

---

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All API endpoints (except `/health`) require authentication via the `x-api-key` header:

```bash
-H "x-api-key: your-api-key-here"
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/videos` | Create a single video generation job |
| `POST` | `/videos/batch` | Create a batch of video generation jobs |
| `GET` | `/videos/:jobId` | Get job status and metadata |
| `GET` | `/videos/:jobId/result` | Get video result (only for completed jobs) |
| `DELETE` | `/videos/:jobId` | Cancel a pending or processing job |
| `GET` | `/videos` | List jobs with filtering and pagination |
| `GET` | `/batches/:batchId` | Get batch status and progress |
| `DELETE` | `/batches/:batchId` | Cancel all jobs in a batch |
| `GET` | `/health` | Health check endpoint |

### Interactive Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

The Swagger UI provides:
- Full endpoint documentation
- Request/response schemas
- Live API testing
- Example payloads
- Authentication setup

### Request Schemas

#### Create Video Request

```typescript
{
  "prompt": string,           // Required: Video description (1-1000 chars)
  "duration"?: number,        // Optional: 5-60 seconds (default: 10)
  "resolution"?: string,      // Optional: "480p" | "720p" | "1080p" | "4k"
  "aspectRatio"?: string,     // Optional: "16:9" | "9:16" | "1:1" | "4:3"
  "style"?: string,           // Optional: Style modifier
  "priority"?: string         // Optional: "low" | "normal" | "high"
}
```

#### Create Batch Request

```typescript
{
  "name"?: string,            // Optional: Batch name
  "videos": [{                // Required: 1-10 videos
    "prompt": string,
    "duration"?: number,
    "resolution"?: string,
    "aspectRatio"?: string,
    "style"?: string,
    "priority"?: string
  }],
  "priority"?: string         // Optional: Batch priority
}
```

### Response Format

All responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "requestId": "req-xxx"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional error context */ }
  },
  "requestId": "req-xxx"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request payload |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `NOT_FOUND` | 404 | Job or resource not found |
| `RATE_LIMIT_ERROR` | 429 | Rate limit exceeded |
| `EXTERNAL_API_ERROR` | 502 | OpenAI Sora API error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Rate Limiting

The API enforces rate limits to prevent abuse:

- **Default**: 100 requests per 60 seconds per API key
- **Headers**: Rate limit info included in response headers
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Timestamp when limit resets

When rate limit is exceeded, you'll receive a `429` response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Rate limit exceeded. Try again in 30 seconds."
  }
}
```

---

## 🏗️ Architecture

The Sora Video API follows a **layered architecture** pattern for maintainability and testability:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│            (Routes, Controllers, Middleware)             │
├─────────────────────────────────────────────────────────┤
│                   Business Logic Layer                   │
│              (Services, Domain Models)                   │
├─────────────────────────────────────────────────────────┤
│                   Data Access Layer                      │
│              (Repositories, Clients)                     │
├─────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                    │
│       (Config, Logging, Error Handling, Types)           │
└─────────────────────────────────────────────────────────┘
```

### Project Structure

```
video-api/
├── src/
│   ├── app.ts                    # Fastify app configuration
│   ├── server.ts                 # Server entry point
│   │
│   ├── config/                   # Configuration management
│   │   ├── env.ts               # Environment variable validation
│   │   └── index.ts             # Config loader
│   │
│   ├── routes/                   # Route definitions
│   │   ├── video.routes.ts      # Video API routes
│   │   └── health.routes.ts     # Health check routes
│   │
│   ├── controllers/              # Request handlers
│   │   ├── VideoController.ts   # Video endpoint logic
│   │   └── HealthController.ts  # Health endpoint logic
│   │
│   ├── services/                 # Business logic
│   │   ├── VideoService.ts      # Video generation logic
│   │   ├── BatchService.ts      # Batch processing logic
│   │   └── HealthService.ts     # Health check logic
│   │
│   ├── repositories/             # Data access
│   │   ├── IJobRepository.ts    # Repository interface
│   │   └── InMemoryJobRepository.ts  # In-memory implementation
│   │
│   ├── clients/                  # External API clients
│   │   ├── ISoraClient.ts       # Sora client interface
│   │   ├── SoraClient.ts        # Real Sora API client
│   │   └── MockSoraClient.ts    # Mock for testing
│   │
│   ├── models/                   # Domain models
│   │   ├── Job.ts               # Job entity
│   │   ├── Batch.ts             # Batch entity
│   │   └── dto/                 # Data transfer objects
│   │
│   ├── middleware/               # Custom middleware
│   │   ├── authenticate.ts      # API key authentication
│   │   ├── errorHandler.ts      # Global error handler
│   │   └── requestLogger.ts     # Request logging
│   │
│   ├── errors/                   # Custom error classes
│   │   ├── AppError.ts          # Base error class
│   │   ├── ValidationError.ts   # Validation errors
│   │   ├── NotFoundError.ts     # 404 errors
│   │   └── ...
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── job.ts               # Job types
│   │   ├── sora.ts              # Sora API types
│   │   └── batch.ts             # Batch types
│   │
│   └── utils/                    # Utility functions
│       └── logger.ts            # Pino logger setup
│
├── tests/                        # Test suites
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   └── fixtures/                # Test data
│
├── docs/                         # Documentation
├── backlog/                      # User stories & planning
├── .env.example                 # Environment template
├── tsconfig.json                # TypeScript config
├── jest.config.cjs              # Jest config
└── package.json                 # Dependencies & scripts
```

### Design Principles

1. **Separation of Concerns**: Each layer has a single, well-defined responsibility
2. **Dependency Inversion**: High-level modules don't depend on low-level modules (interfaces used)
3. **Open/Closed Principle**: Open for extension, closed for modification
4. **Type Safety**: Strict TypeScript with compile-time guarantees
5. **Testability**: Dependency injection enables easy mocking and testing
6. **Error Handling**: Consistent error propagation with custom error classes
7. **Logging**: Structured logging for debugging and monitoring

### Data Flow

```
Request → Middleware → Route → Controller → Service → Repository/Client → Response
           ↓            ↓         ↓           ↓            ↓
        Auth/Log     Validate   Parse     Business    Data/API
```

---

## 🛠️ Development

### Development Workflow

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check

# Run all quality checks
npm run validate
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` | No |
| `PORT` | Server port | `3000` | No |
| `HOST` | Server host | `0.0.0.0` | No |
| `OPENAI_API_KEY` | OpenAI API key | - | **Yes** |
| `OPENAI_SORA_BASE_URL` | Sora API base URL | `https://api.openai.com/v1/sora` | No |
| `OPENAI_TIMEOUT` | API request timeout (ms) | `30000` | No |
| `OPENAI_MAX_RETRIES` | Max retry attempts | `3` | No |
| `API_KEY` | Authentication API key | - | **Yes** |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | No |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `60000` | No |
| `LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` | No |
| `LOG_PRETTY` | Pretty-print logs in dev | `true` | No |

### Code Style

This project uses:

- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** strict mode

Configuration files:
- `.eslintrc.cjs` - ESLint rules
- `.prettierrc` - Prettier formatting
- `tsconfig.json` - TypeScript compiler options

### Adding New Features

1. **Create a new branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Implement the feature** following the layered architecture:
   - Add types in `src/types/`
   - Create/update models in `src/models/`
   - Add repository methods in `src/repositories/`
   - Implement service logic in `src/services/`
   - Create controller methods in `src/controllers/`
   - Define routes in `src/routes/`

3. **Write tests**
   - Unit tests for services/utilities
   - Integration tests for controllers/routes
   - E2E tests for complete workflows

4. **Validate changes**
   ```bash
   npm run validate
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/my-new-feature
   ```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/                      # Unit tests (isolated components)
├── integration/               # Integration tests (multiple components)
│   └── routes/
│       ├── video.routes.test.ts
│       └── health.test.ts
├── e2e/                       # End-to-end tests (full workflows)
│   └── video-workflow.e2e.test.ts
└── fixtures/                  # Test data and mocks
    └── testData.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- video.routes.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should create video"
```

### Writing Tests

**Example Unit Test:**

```typescript
import { describe, it, expect } from '@jest/globals';
import { VideoService } from '../../src/services/VideoService';
import { MockSoraClient } from '../../src/clients/MockSoraClient';

describe('VideoService', () => {
  it('should create a video job successfully', async () => {
    const mockRepository = createMockRepository();
    const mockClient = new MockSoraClient();
    const service = new VideoService(mockRepository, mockClient);

    const result = await service.createVideo({
      prompt: 'Test video',
      duration: 10,
      resolution: '1080p',
    });

    expect(result.jobId).toBeDefined();
    expect(result.status).toBe('pending');
  });
});
```

**Example Integration Test:**

```typescript
import { buildApp } from '../../src/app';

describe('POST /api/v1/videos', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a video job', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': 'test-api-key',
      },
      payload: {
        prompt: 'A beautiful sunset',
        duration: 10,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().success).toBe(true);
  });
});
```

### Test Coverage

Current coverage targets:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report:
```bash
npm run test:coverage
# Open coverage/lcov-report/index.html in browser
```

---

## 🚢 Deployment

### Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Output will be in dist/ directory
```

### Running in Production

```bash
# Set environment to production
export NODE_ENV=production

# Disable pretty logging for JSON logs
export LOG_PRETTY=false

# Start the server
npm start
```

### Docker Deployment (Coming Soon)

```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Environment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `API_KEY` value
- [ ] Configure `OPENAI_API_KEY` with production credentials
- [ ] Set appropriate `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW`
- [ ] Disable `LOG_PRETTY` for JSON logs
- [ ] Set `LOG_LEVEL=info` or `warn`
- [ ] Configure reverse proxy (nginx, Apache)
- [ ] Set up SSL/TLS certificates
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation (ELK, Datadog, etc.)
- [ ] Implement health check monitoring
- [ ] Configure process manager (PM2, systemd)

### Monitoring & Observability

**Health Endpoint:**
```bash
curl http://localhost:3000/health
```

**Log Format:**

Production logs are output as JSON for easy parsing:
```json
{
  "level": "info",
  "time": "2025-10-18T10:30:00.000Z",
  "pid": 12345,
  "hostname": "server-01",
  "msg": "Request completed",
  "requestId": "req-abc123",
  "method": "POST",
  "url": "/api/v1/videos",
  "statusCode": 201,
  "duration": 150
}
```

**Recommended Monitoring:**
- CPU and memory usage
- Request rate and latency (p50, p95, p99)
- Error rate by endpoint
- OpenAI API call success/failure rate
- Job queue length and processing time
- Rate limit hits

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug fixes, new features, documentation improvements, or examples—all contributions are appreciated.

### How to Contribute

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/video-api.git
   cd video-api
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Run quality checks: `npm run validate`

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   **Commit message format:**
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Maintenance tasks

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes clearly

### Development Guidelines

- **Code Style**: Follow existing patterns, use ESLint and Prettier
- **Type Safety**: Add proper TypeScript types, avoid `any`
- **Testing**: Write tests for new features (aim for >80% coverage)
- **Documentation**: Update README and inline comments
- **Commits**: Use conventional commit messages
- **Pull Requests**: Keep PRs focused and reasonably sized

### Reporting Bugs

Found a bug? Please open an issue with:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Node version, OS, etc.
- **Logs**: Relevant error messages or logs

### Suggesting Features

Have an idea? Open an issue with:

- **Feature Description**: What you'd like to see
- **Use Case**: Why this feature would be useful
- **Proposed Solution**: How you think it should work
- **Alternatives**: Other approaches considered

### Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Sora Video API Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

This project was built with inspiration and guidance from:

- **[Fastify](https://www.fastify.io/)** - Fast and low overhead web framework
- **[OpenAI](https://openai.com/)** - Sora video generation model
- **[Pino](https://getpino.io/)** - Super fast, all natural JSON logger
- **[TypeScript](https://www.typescriptlang.org/)** - JavaScript with syntax for types
- **[Jest](https://jestjs.io/)** - Delightful JavaScript testing

### Special Thanks

- The Fastify team for creating an outstanding Node.js framework
- OpenAI for pushing the boundaries of AI-powered creativity
- The TypeScript team for making JavaScript development a joy
- All contributors who help improve this project

---

## 📞 Support & Community

### Get Help

- **📖 Documentation**: Read the full [API Documentation](#-api-documentation)
- **🐛 Bug Reports**: [Open an issue](https://github.com/cr-nattress/video-api/issues)
- **💡 Feature Requests**: [Suggest a feature](https://github.com/cr-nattress/video-api/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/cr-nattress/video-api/discussions)
- **📧 Contact**: For security issues, email the maintainers directly

### Stay Updated

- ⭐ **Star this repo** on GitHub to show support
- 👀 **Watch releases** to get notified of updates
- 🍴 **Fork** to start building your own version

---

<div align="center">

**Built with ❤️ using TypeScript, Fastify, and OpenAI Sora**

[Report Bug](https://github.com/cr-nattress/video-api/issues) · [Request Feature](https://github.com/cr-nattress/video-api/issues) · [Documentation](#-api-documentation)

</div>
