/**
 * Health check routes
 */
import { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/HealthController.js';
import { HealthService } from '../services/HealthService.js';
import { InMemoryJobRepository } from '../repositories/index.js';
import { MockSoraClient } from '../clients/index.js';

export async function healthRoutes(app: FastifyInstance) {
  // Initialize dependencies (these will be replaced with DI container later)
  const jobRepository = new InMemoryJobRepository();
  const soraClient = new MockSoraClient();
  const healthService = new HealthService(jobRepository, soraClient);
  const healthController = new HealthController(healthService);

  // Health check endpoint (liveness probe)
  app.get(
    '/health',
    {
      schema: {
        description: 'Basic health check endpoint (liveness probe)',
        tags: ['health'],
        response: {
          200: {
            description: 'Service is healthy',
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              checks: {
                type: 'object',
                properties: {
                  api: { type: 'string', example: 'healthy' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => healthController.getHealth(request, reply),
  );

  // Readiness check endpoint
  app.get(
    '/ready',
    {
      schema: {
        description: 'Readiness probe with dependency health checks',
        tags: ['health'],
        response: {
          200: {
            description: 'Service is ready',
            type: 'object',
            properties: {
              ready: { type: 'boolean', example: true },
              checks: {
                type: 'object',
                properties: {
                  repository: { type: 'string', example: 'healthy' },
                  soraClient: { type: 'string', example: 'healthy' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          503: {
            description: 'Service is not ready',
            type: 'object',
            properties: {
              ready: { type: 'boolean', example: false },
              checks: {
                type: 'object',
                properties: {
                  repository: { type: 'string', example: 'unhealthy' },
                  soraClient: { type: 'string', example: 'unhealthy' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => healthController.getReadiness(request, reply),
  );

  // Metrics endpoint
  app.get(
    '/metrics',
    {
      schema: {
        description: 'Application metrics',
        tags: ['health'],
        response: {
          200: {
            description: 'Application metrics',
            type: 'object',
            properties: {
              jobs: {
                type: 'object',
                properties: {
                  total: { type: 'number', example: 100 },
                  pending: { type: 'number', example: 10 },
                  processing: { type: 'number', example: 5 },
                  completed: { type: 'number', example: 80 },
                  failed: { type: 'number', example: 3 },
                  cancelled: { type: 'number', example: 2 },
                },
              },
              system: {
                type: 'object',
                properties: {
                  uptime: { type: 'number', example: 3600000 },
                  memory: {
                    type: 'object',
                    properties: {
                      used: { type: 'number', example: 50000000 },
                      total: { type: 'number', example: 100000000 },
                      percentage: { type: 'number', example: 50 },
                    },
                  },
                  nodeVersion: { type: 'string', example: 'v18.0.0' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => healthController.getMetrics(request, reply),
  );
}
