/**
 * Fastify application setup
 * Configures plugins, routes, and middleware
 */
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { errorHandler, requestLogger } from './middleware/index.js';
import { config } from './config/index.js';

/**
 * Build and configure the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production' && process.env.LOG_PRETTY === 'true'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    disableRequestLogging: true, // We use custom request logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // Register CORS support
  await app.register(cors, {
    origin: true, // Allow all origins (configure this based on your needs)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-request-id'],
  });

  // Register Swagger documentation
  await app.register(swagger, {
    openapi: {
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
          url: `http://localhost:${config.server.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'videos', description: 'Video generation endpoints' },
        { name: 'health', description: 'Health check and monitoring endpoints' },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
            description: 'API key for authentication',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Validation failed' },
                  details: { type: 'object' },
                },
              },
              requestId: { type: 'string', example: 'req_123456' },
            },
          },
          Success: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              requestId: { type: 'string', example: 'req_123456' },
            },
          },
          HealthCheck: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  });

  // Register Swagger UI
  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Register global error handler
  app.setErrorHandler(errorHandler);

  // Register request logging middleware
  app.addHook('onRequest', requestLogger);

  // Register health routes (no authentication)
  await app.register(async (instance) => {
    const { healthRoutes } = await import('./routes/health.routes.js');
    await healthRoutes(instance);
  });

  // Register video routes (with authentication)
  await app.register(async (instance) => {
    const { videoRoutes } = await import('./routes/video.routes.js');
    await videoRoutes(instance);
  });

  return app;
}
