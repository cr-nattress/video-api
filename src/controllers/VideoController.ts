/**
 * Video controller
 * Handles HTTP requests for video operations
 */
import { FastifyReply, FastifyRequest } from 'fastify';
import { IVideoService } from '../services/index.js';
import { IBatchService } from '../services/index.js';
import { CreateVideoRequest, BatchVideoRequest } from '../models/index.js';
import { logVideoRequest } from '../utils/fileLogger.js';
import { logger } from '../utils/logger.js';

export class VideoController {
  constructor(
    private videoService: IVideoService,
    private batchService: IBatchService,
  ) {}

  /**
   * POST /api/v1/videos - Create a single video
   */
  async createVideo(
    request: FastifyRequest<{ Body: CreateVideoRequest }>,
    reply: FastifyReply,
  ) {
    let job;
    let logPath;

    try {
      // Create video job
      job = await this.videoService.createVideo(request.body);

      // Prepare response
      const response = {
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          message: 'Video generation job created successfully',
        },
        requestId: request.id,
      };

      // Log detailed request/response to file
      try {
        logPath = await logVideoRequest({
          requestId: request.id as string,
          prompt: request.body.prompt,
          jobId: job.id,
          request: {
            body: request.body,
            headers: {
              'user-agent': request.headers['user-agent'],
              'content-type': request.headers['content-type'],
            },
            ip: request.ip,
            method: request.method,
            url: request.url,
          },
          response,
        });

        logger.info({ logPath, jobId: job.id }, 'Video request logged to file');
      } catch (logError) {
        // Don't fail the request if logging fails
        logger.error({ error: logError, jobId: job.id }, 'Failed to write log file');
      }

      return reply.status(201).send(response);
    } catch (error) {
      // Log error to file if we have a job ID
      if (job?.id) {
        try {
          logPath = await logVideoRequest({
            requestId: request.id as string,
            prompt: request.body.prompt,
            jobId: job.id,
            request: {
              body: request.body,
              headers: {
                'user-agent': request.headers['user-agent'],
                'content-type': request.headers['content-type'],
              },
              ip: request.ip,
              method: request.method,
              url: request.url,
            },
            error,
          });

          logger.info({ logPath, jobId: job.id }, 'Video request error logged to file');
        } catch (logError) {
          logger.error({ error: logError, jobId: job.id }, 'Failed to write error log file');
        }
      }

      // Re-throw the error to be handled by the error handler
      throw error;
    }
  }

  /**
   * POST /api/v1/videos/batch - Create batch of videos
   */
  async createBatch(
    request: FastifyRequest<{ Body: BatchVideoRequest }>,
    reply: FastifyReply,
  ) {
    const batch = await this.batchService.createBatch(request.body);

    return reply.status(201).send({
      success: true,
      data: {
        batchId: batch.id,
        jobIds: batch.jobIds,
        total: batch.jobIds.length,
        message: 'Video batch created successfully',
      },
      requestId: request.id,
    });
  }

  /**
   * GET /api/v1/videos/:jobId - Get job status
   */
  async getJobStatus(
    request: FastifyRequest<{ Params: { jobId: string } }>,
    reply: FastifyReply,
  ) {
    const job = await this.videoService.getVideoStatus(request.params.jobId);

    return reply.status(200).send({
      success: true,
      data: {
        id: job.id,
        prompt: job.prompt,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        error: job.error,
      },
      requestId: request.id,
    });
  }

  /**
   * GET /api/v1/videos/:jobId/result - Get video result
   */
  async getVideoResult(
    request: FastifyRequest<{ Params: { jobId: string } }>,
    reply: FastifyReply,
  ) {
    const result = await this.videoService.getVideoResult(request.params.jobId);

    return reply.status(200).send({
      success: true,
      data: result,
      requestId: request.id,
    });
  }

  /**
   * DELETE /api/v1/videos/:jobId - Cancel job
   */
  async cancelJob(
    request: FastifyRequest<{ Params: { jobId: string } }>,
    reply: FastifyReply,
  ) {
    const job = await this.videoService.cancelVideo(request.params.jobId);

    return reply.status(200).send({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Video job cancelled successfully',
      },
      requestId: request.id,
    });
  }

  /**
   * GET /api/v1/videos - List jobs with filtering
   */
  async listJobs(
    request: FastifyRequest<{
      Querystring: {
        status?: string;
        priority?: string;
        page?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    const page = parseInt(request.query.page || '1', 10);
    const limit = parseInt(request.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const result = await this.videoService.listJobs({
      status: request.query.status,
      priority: request.query.priority,
      limit,
      offset,
    });

    return reply.status(200).send({
      success: true,
      data: result.jobs.map((job) => ({
        id: job.id,
        prompt: job.prompt,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore,
      },
      requestId: request.id,
    });
  }

  /**
   * GET /api/v1/batches/:batchId - Get batch status
   */
  async getBatchStatus(
    request: FastifyRequest<{ Params: { batchId: string } }>,
    reply: FastifyReply,
  ) {
    const batch = await this.batchService.getBatchStatus(request.params.batchId);

    return reply.status(200).send({
      success: true,
      data: {
        id: batch.id,
        name: batch.name,
        status: batch.status,
        progress: batch.progress,
        jobIds: batch.jobIds,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt.toISOString(),
        completedAt: batch.completedAt?.toISOString(),
      },
      requestId: request.id,
    });
  }

  /**
   * DELETE /api/v1/batches/:batchId - Cancel batch
   */
  async cancelBatch(
    request: FastifyRequest<{ Params: { batchId: string } }>,
    reply: FastifyReply,
  ) {
    const batch = await this.batchService.cancelBatch(request.params.batchId);

    return reply.status(200).send({
      success: true,
      data: {
        batchId: batch.id,
        status: batch.status,
        message: 'Batch cancelled successfully',
      },
      requestId: request.id,
    });
  }
}
