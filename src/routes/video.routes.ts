/**
 * Video routes with Swagger documentation
 */
import { FastifyInstance } from 'fastify';
import { VideoController } from '../controllers/index.js';
import { VideoService, BatchService } from '../services/index.js';
import { InMemoryJobRepository } from '../repositories/index.js';
import { SoraV1Client } from '../clients/index.js';
import { authenticate } from '../middleware/index.js';

export async function videoRoutes(app: FastifyInstance) {
  // Initialize dependencies (will be replaced with DI container later)
  const jobRepository = new InMemoryJobRepository();
  const soraClient = new SoraV1Client();
  const videoService = new VideoService(jobRepository, soraClient);
  const batchService = new BatchService(videoService, jobRepository);
  const videoController = new VideoController(videoService, batchService);

  // Apply authentication to all routes
  app.addHook('onRequest', authenticate);

  // POST /api/v1/videos - Create single video
  app.post(
    '/api/v1/videos',
    {
      schema: {
        description: 'Create a single video generation job',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 1000 },
            duration: { type: 'number', minimum: 5, maximum: 60 },
            resolution: { type: 'string', enum: ['480p', '720p', '1080p', '4k'] },
            aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:3'] },
            style: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'normal', 'high'] },
          },
        },
        response: {
          201: {
            description: 'Video job created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.createVideo(request as any, reply),
  );

  // POST /api/v1/videos/batch - Create batch
  app.post(
    '/api/v1/videos/batch',
    {
      schema: {
        description: 'Create a batch of video generation jobs',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        body: {
          type: 'object',
          required: ['videos'],
          properties: {
            name: { type: 'string' },
            videos: {
              type: 'array',
              minItems: 1,
              maxItems: 10,
              items: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string', minLength: 1, maxLength: 1000 },
                  duration: { type: 'number', minimum: 5, maximum: 60 },
                  resolution: { type: 'string', enum: ['480p', '720p', '1080p', '4k'] },
                  aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:3'] },
                  style: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'normal', 'high'] },
                },
              },
            },
            priority: { type: 'string', enum: ['low', 'normal', 'high'] },
          },
        },
        response: {
          201: {
            description: 'Batch created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  batchId: { type: 'string' },
                  jobIds: { type: 'array', items: { type: 'string' } },
                  total: { type: 'number' },
                  message: { type: 'string' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.createBatch(request as any, reply),
  );

  // GET /api/v1/videos/:jobId - Get job status
  app.get(
    '/api/v1/videos/:jobId',
    {
      schema: {
        description: 'Get video job status',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Job status',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  prompt: { type: 'string' },
                  status: { type: 'string' },
                  priority: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  startedAt: { type: 'string', format: 'date-time' },
                  completedAt: { type: 'string', format: 'date-time' },
                  error: { type: 'string' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.getJobStatus(request as any, reply),
  );

  // GET /api/v1/videos/:jobId/result - Get video result
  app.get(
    '/api/v1/videos/:jobId/result',
    {
      schema: {
        description: 'Get video result (only for completed jobs)',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Video result',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  prompt: { type: 'string' },
                  status: { type: 'string' },
                  priority: { type: 'string' },
                  result: {
                    type: 'object',
                    properties: {
                      videoUrl: { type: 'string' },
                      thumbnailUrl: { type: 'string' },
                      duration: { type: 'number' },
                      resolution: { type: 'string' },
                      fileSize: { type: 'number' },
                      format: { type: 'string' },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  completedAt: { type: 'string', format: 'date-time' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.getVideoResult(request as any, reply),
  );

  // DELETE /api/v1/videos/:jobId - Cancel job
  app.delete(
    '/api/v1/videos/:jobId',
    {
      schema: {
        description: 'Cancel a video job',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Job cancelled',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.cancelJob(request as any, reply),
  );

  // GET /api/v1/videos - List jobs
  app.get(
    '/api/v1/videos',
    {
      schema: {
        description: 'List video jobs with filtering and pagination',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            priority: { type: 'string' },
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'List of jobs',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    prompt: { type: 'string' },
                    status: { type: 'string' },
                    priority: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.listJobs(request as any, reply),
  );

  // GET /api/v1/batches/:batchId - Get batch status
  app.get(
    '/api/v1/batches/:batchId',
    {
      schema: {
        description: 'Get batch status',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          required: ['batchId'],
          properties: {
            batchId: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Batch status',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                  progress: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      completed: { type: 'number' },
                      failed: { type: 'number' },
                      pending: { type: 'number' },
                      processing: { type: 'number' },
                      cancelled: { type: 'number' },
                      percentage: { type: 'number' },
                    },
                  },
                  jobIds: { type: 'array', items: { type: 'string' } },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  completedAt: { type: 'string', format: 'date-time' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.getBatchStatus(request as any, reply),
  );

  // DELETE /api/v1/batches/:batchId - Cancel batch
  app.delete(
    '/api/v1/batches/:batchId',
    {
      schema: {
        description: 'Cancel a batch',
        tags: ['videos'],
        security: [{ apiKey: [] }],
        params: {
          type: 'object',
          required: ['batchId'],
          properties: {
            batchId: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Batch cancelled',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  batchId: { type: 'string' },
                  status: { type: 'string' },
                  message: { type: 'string' },
                },
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => videoController.cancelBatch(request as any, reply),
  );
}
