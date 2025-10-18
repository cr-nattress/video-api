# User Story: US-011 - Health Check & Monitoring Endpoints

## Story Description
**As a** DevOps engineer
**I want** health check and monitoring endpoints
**So that** I can monitor API health and readiness for production deployments

## Acceptance Criteria
- [ ] GET /health endpoint implemented
- [ ] GET /ready endpoint (readiness probe)
- [ ] GET /metrics endpoint (basic metrics)
- [ ] System status checks
- [ ] Dependency health checks
- [ ] Performance metrics collection
- [ ] No authentication required for health endpoints

## Story Points
2

## Priority
Must Have (P0)

## Dependencies
- US-001 (Project Foundation)
- US-002 (Infrastructure & Logging)

## Technical Notes
- Health endpoints should not require authentication
- Keep response times fast (< 100ms)
- Cache metrics to avoid performance impact
- Support Kubernetes liveness/readiness probes
- Include minimal but useful information

---

## Endpoints

### 1. Health Check (Liveness Probe)
```
GET /health
```

**Purpose**: Basic health check to verify service is running

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "down",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": "Critical service failure"
}
```

### 2. Readiness Check (Readiness Probe)
```
GET /ready
```

**Purpose**: Check if service is ready to handle requests

**Response (200 OK - Ready):**
```json
{
  "ready": true,
  "checks": {
    "repository": "healthy",
    "soraClient": "healthy"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response (503 Service Unavailable - Not Ready):**
```json
{
  "ready": false,
  "checks": {
    "repository": "healthy",
    "soraClient": "unhealthy"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": "Sora API unavailable"
}
```

### 3. Metrics Endpoint
```
GET /metrics
```

**Purpose**: Provide basic application metrics

**Response (200 OK):**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "jobs": {
    "total": 1000,
    "pending": 50,
    "processing": 20,
    "completed": 900,
    "failed": 25,
    "cancelled": 5
  },
  "api": {
    "requests": {
      "total": 5000,
      "successful": 4975,
      "failed": 25
    },
    "avgResponseTime": 150
  },
  "system": {
    "memory": {
      "used": 256000000,
      "total": 512000000,
      "percentage": 50
    },
    "process": {
      "cpu": 25.5,
      "pid": 1234
    }
  }
}
```

---

## Implementation

### Health Controller
```typescript
// src/controllers/HealthController.ts

export class HealthController {
  private startTime: number;
  private version: string;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
  }

  /**
   * Basic health check
   */
  async health(request: FastifyRequest, reply: FastifyReply) {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
    };
  }

  /**
   * Readiness check with dependency validation
   */
  async ready(request: FastifyRequest, reply: FastifyReply) {
    const checks = await this.performHealthChecks();
    const ready = Object.values(checks).every((status) => status === 'healthy');

    if (!ready) {
      reply.status(503);
      return {
        ready: false,
        checks,
        timestamp: new Date().toISOString(),
        error: 'One or more dependencies are unhealthy',
      };
    }

    return {
      ready: true,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Application metrics
   */
  async metrics(request: FastifyRequest, reply: FastifyReply) {
    const repository = getJobRepository();
    const stats = await repository.getStats();

    return {
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      jobs: stats,
      api: await this.getApiMetrics(),
      system: this.getSystemMetrics(),
    };
  }

  /**
   * Perform health checks on dependencies
   */
  private async performHealthChecks(): Promise<Record<string, string>> {
    const checks: Record<string, string> = {};

    // Check repository
    try {
      const repository = getJobRepository();
      await repository.exists('health-check');
      checks.repository = 'healthy';
    } catch (error) {
      checks.repository = 'unhealthy';
    }

    // Check Sora client
    try {
      const soraClient = getSoraClient();
      const healthy = await soraClient.healthCheck();
      checks.soraClient = healthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      checks.soraClient = 'unhealthy';
    }

    return checks;
  }

  /**
   * Get API metrics
   */
  private async getApiMetrics() {
    // In production, these would come from a metrics collector
    return {
      requests: {
        total: 0, // TODO: Implement request counter
        successful: 0,
        failed: 0,
      },
      avgResponseTime: 0,
    };
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics() {
    const memUsage = process.memoryUsage();

    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      process: {
        cpu: process.cpuUsage().user / 1000000, // Convert to seconds
        pid: process.pid,
      },
    };
  }
}
```

### Health Routes
```typescript
// src/routes/health.routes.ts

export async function healthRoutes(app: FastifyInstance) {
  const controller = new HealthController();

  app.get('/health', {
    schema: {
      tags: ['health'],
      description: 'Basic health check endpoint',
      response: {
        200: HealthSchema,
      },
    },
  }, controller.health.bind(controller));

  app.get('/ready', {
    schema: {
      tags: ['health'],
      description: 'Readiness check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            checks: { type: 'object' },
            timestamp: { type: 'string' },
          },
        },
        503: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            checks: { type: 'object' },
            timestamp: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, controller.ready.bind(controller));

  app.get('/metrics', {
    schema: {
      tags: ['health'],
      description: 'Application metrics endpoint',
      response: {
        200: {
          type: 'object',
          description: 'Application metrics',
        },
      },
    },
  }, controller.metrics.bind(controller));
}
```

### Register in App
```typescript
// src/app.ts

import { healthRoutes } from './routes/health.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ ... });

  // Register health routes (no authentication required)
  await app.register(healthRoutes);

  // ... other setup

  return app;
}
```

---

## Kubernetes Integration

### Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

---

## Testing

### Unit Tests
```typescript
// tests/unit/controllers/HealthController.test.ts

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  describe('health', () => {
    it('should return ok status', async () => {
      const result = await controller.health(mockRequest, mockReply);

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBeDefined();
    });
  });

  describe('ready', () => {
    it('should return ready:true when all checks pass', async () => {
      // Mock healthy dependencies
      const result = await controller.ready(mockRequest, mockReply);

      expect(result.ready).toBe(true);
      expect(result.checks).toBeDefined();
    });

    it('should return ready:false when a check fails', async () => {
      // Mock unhealthy dependency
      const result = await controller.ready(mockRequest, mockReply);

      expect(result.ready).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('metrics', () => {
    it('should return application metrics', async () => {
      const result = await controller.metrics(mockRequest, mockReply);

      expect(result.jobs).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### Integration Tests
```typescript
// tests/integration/health.routes.test.ts

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('GET /ready should return 200 when healthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ready).toBe(true);
  });

  it('GET /metrics should return metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.jobs).toBeDefined();
    expect(body.system).toBeDefined();
  });

  it('health endpoints should not require authentication', async () => {
    const endpoints = ['/health', '/ready', '/metrics'];

    for (const endpoint of endpoints) {
      const response = await app.inject({
        method: 'GET',
        url: endpoint,
        // No x-api-key header
      });

      expect(response.statusCode).not.toBe(401);
    }
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
- [ ] Unit tests for health controller
- [ ] Integration tests for all endpoints
- [ ] Test healthy states
- [ ] Test unhealthy states
- [ ] Test no authentication required
- [ ] All tests passing
- [ ] Coverage >= 70%

### Functionality
- [ ] /health endpoint working
- [ ] /ready endpoint working
- [ ] /metrics endpoint working
- [ ] Dependency checks working
- [ ] System metrics accurate
- [ ] Fast response times (< 100ms)
- [ ] No authentication required

### Documentation
- [ ] All methods documented
- [ ] Create /docs/US-011-health-monitoring-guide.md
- [ ] Kubernetes examples included
- [ ] Monitoring setup documented

### Integration
- [ ] Routes registered in app
- [ ] Health checks integrate with services
- [ ] Swagger documentation complete
- [ ] Logging integrated

---

## Verification Steps

1. **Test Health Endpoint**
   ```bash
   curl http://localhost:3000/health
   # Should return 200 with status: ok
   ```

2. **Test Ready Endpoint**
   ```bash
   curl http://localhost:3000/ready
   # Should return 200 with ready: true
   ```

3. **Test Metrics Endpoint**
   ```bash
   curl http://localhost:3000/metrics | jq
   # Should return detailed metrics
   ```

4. **Test Response Times**
   ```bash
   time curl http://localhost:3000/health
   # Should complete in < 100ms
   ```

5. **Run Tests**
   ```bash
   npm test tests/integration/health.routes.test.ts
   ```

---

## Notes for Developers

- Health endpoints do NOT require authentication
- Keep response times fast (< 100ms)
- Cache metrics to avoid performance impact
- Use 200 for healthy, 503 for unhealthy
- Include useful debugging information
- Test with Kubernetes probes
- Monitor endpoint performance
- Log health check failures

## Related Documentation

- `/docs/US-011-health-monitoring-guide.md` (to be created)
- Kubernetes Health Checks: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
