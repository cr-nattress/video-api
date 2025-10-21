/**
 * Video generation service
 * Handles business logic for video generation
 */
import { IVideoService } from './IVideoService.js';
import { IJobRepository } from '../repositories/index.js';
import { ISoraClient } from '../clients/index.js';
import { Job, JobStatus, JobPriority, VideoResult } from '../types/index.js';
import { CreateVideoRequest, VideoResultResponse } from '../models/index.js';
import {
  createJob,
  updateJobStatus,
  updateJobResult,
  updateJobSoraId,
} from '../models/Job.js';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

export class VideoService implements IVideoService {
  constructor(
    private jobRepository: IJobRepository,
    private soraClient: ISoraClient,
  ) {}

  /**
   * Create a new video generation job
   */
  async createVideo(request: CreateVideoRequest): Promise<Job> {
    // Validate request
    this.validateVideoRequest(request);

    // Determine priority
    const priority = this.mapPriority(request.priority);

    // Create job
    const job = createJob(request.prompt, priority, {
      duration: request.duration,
      resolution: request.resolution,
      aspectRatio: request.aspectRatio,
      style: request.style,
    });

    // Save job to repository
    await this.jobRepository.create(job);

    logger.info({ jobId: job.id, prompt: request.prompt }, 'Video job created');

    // Submit to Sora API asynchronously
    this.submitToSora(job.id, request).catch((error) => {
      logger.error({ jobId: job.id, error }, 'Failed to submit job to Sora API');
    });

    return job;
  }

  /**
   * Get video job status
   */
  async getVideoStatus(jobId: string): Promise<Job> {
    const job = await this.jobRepository.findById(jobId);

    if (!job) {
      throw new NotFoundError('Video job', jobId);
    }

    return job;
  }

  /**
   * Get video result (only if completed)
   */
  async getVideoResult(jobId: string): Promise<VideoResultResponse> {
    const job = await this.getVideoStatus(jobId);

    if (job.status !== JobStatus.COMPLETED) {
      throw new ValidationError(
        `Video job is not completed yet. Current status: ${job.status}`,
      );
    }

    if (!job.result) {
      throw new ValidationError('Video job completed but no result available');
    }

    return this.mapJobToResponse(job);
  }

  /**
   * Cancel a video generation job
   */
  async cancelVideo(jobId: string): Promise<Job> {
    const job = await this.getVideoStatus(jobId);

    // Check if job can be cancelled
    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) {
      throw new ValidationError(`Cannot cancel job with status: ${job.status}`);
    }

    // Cancel in Sora API if job was submitted
    if (job.soraJobId) {
      try {
        await this.soraClient.cancelVideo(job.soraJobId);
      } catch (error) {
        logger.warn({ jobId, soraJobId: job.soraJobId, error }, 'Failed to cancel job in Sora API');
      }
    }

    // Update job status
    const updatedJob = updateJobStatus(job, JobStatus.CANCELLED);
    await this.jobRepository.update(jobId, updatedJob);

    logger.info({ jobId }, 'Video job cancelled');

    return updatedJob;
  }

  /**
   * Sync job status with Sora API
   */
  async syncJobStatus(jobId: string): Promise<Job> {
    const job = await this.getVideoStatus(jobId);

    // Only sync jobs that are in progress
    if (
      job.status !== JobStatus.PENDING &&
      job.status !== JobStatus.PROCESSING
    ) {
      return job;
    }

    // Check if job has Sora job ID
    if (!job.soraJobId) {
      logger.warn({ jobId }, 'Cannot sync job without Sora job ID');
      return job;
    }

    try {
      // Get status from Sora API
      const soraResponse = await this.soraClient.getVideoStatus(job.soraJobId);

      // Map Sora status to our job status
      let updatedJob = job;

      // Map v1 API status to internal status
      if (soraResponse.status === 'completed' && soraResponse.generations.length > 0) {
        // Extract first generation (primary video)
        const generation = soraResponse.generations[0];
        const videoResult: VideoResult = {
          videoUrl: generation.video_url,
          thumbnailUrl: undefined, // v1 doesn't provide thumbnails
          duration: soraResponse.n_seconds,
          resolution: `${soraResponse.width}x${soraResponse.height}`,
          fileSize: undefined, // v1 doesn't provide file size in status
          format: 'mp4', // v1 always returns MP4
        };
        updatedJob = updateJobResult(job, videoResult);
      } else if (soraResponse.status === 'failed') {
        const errorMessage = soraResponse.failure_reason || 'Video generation failed';
        updatedJob = updateJobStatus(job, JobStatus.FAILED, errorMessage);
      } else if (soraResponse.status === 'in_progress') {
        // v1 uses "in_progress" not "processing"
        updatedJob = updateJobStatus(job, JobStatus.PROCESSING);
      } else if (soraResponse.status === 'queued') {
        updatedJob = updateJobStatus(job, JobStatus.PENDING);
      } else if (soraResponse.status === 'cancelled') {
        updatedJob = updateJobStatus(job, JobStatus.CANCELLED);
      }

      // Save updated job
      if (updatedJob !== job) {
        await this.jobRepository.update(jobId, updatedJob);
        logger.info(
          { jobId, oldStatus: job.status, newStatus: updatedJob.status },
          'Job status synced',
        );
      }

      return updatedJob;
    } catch (error) {
      logger.error({ jobId, error }, 'Failed to sync job status');
      throw error;
    }
  }

  /**
   * List all jobs with optional filtering
   */
  async listJobs(options?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: Job[]; total: number; hasMore: boolean }> {
    const result = await this.jobRepository.findAll({
      status: options?.status as JobStatus,
      priority: options?.priority,
      limit: options?.limit || 20,
      offset: options?.offset || 0,
    });

    return {
      jobs: result.data,
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  /**
   * Submit job to Sora API (async)
   */
  private async submitToSora(jobId: string, request: CreateVideoRequest): Promise<void> {
    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new NotFoundError('Video job', jobId);
      }

      // Prepare Sora API request
      const soraRequest = {
        model: request.model || ('sora-2' as const),
        prompt: request.prompt,
        duration: request.duration,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        style: request.style,
      };

      // Submit to Sora API (logging happens inside the client)
      const soraResponse = await this.soraClient.createVideo(soraRequest, jobId);

      // Update job with Sora job ID and status
      let updatedJob = updateJobSoraId(job, soraResponse.id);
      updatedJob = updateJobStatus(updatedJob, JobStatus.PROCESSING);

      await this.jobRepository.update(jobId, updatedJob);

      logger.info(
        { jobId, soraJobId: soraResponse.id },
        'Job submitted to Sora API',
      );
    } catch (error) {
      logger.error({ jobId, error }, 'Failed to submit job to Sora API');
      // Error logging to file happens in SoraClient

      // Update job status to failed
      const job = await this.jobRepository.findById(jobId);
      if (job) {
        const updatedJob = updateJobStatus(
          job,
          JobStatus.FAILED,
          'Failed to submit to Sora API',
        );
        await this.jobRepository.update(jobId, updatedJob);
      }
    }
  }

  /**
   * Validate video request against Sora v1 constraints
   */
  private validateVideoRequest(request: CreateVideoRequest): void {
    // Validate prompt
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new ValidationError('Prompt is required');
    }

    if (request.prompt.length > 1000) {
      throw new ValidationError('Prompt must be less than 1000 characters');
    }

    // Validate duration (Sora v1: 1-20 seconds)
    if (request.duration !== undefined) {
      if (request.duration < 1 || request.duration > 20) {
        throw new ValidationError(
          'Duration must be between 1 and 20 seconds per Sora v1 specification'
        );
      }
      if (!Number.isInteger(request.duration)) {
        throw new ValidationError('Duration must be an integer');
      }
    }

    // Validate resolution (Sora v1: max 1080p, no 4K support)
    if (request.resolution) {
      const validResolutions = ['480p', '720p', '1080p'];
      if (!validResolutions.includes(request.resolution)) {
        throw new ValidationError(
          `Resolution must be one of: ${validResolutions.join(', ')}. 4K is not supported in Sora v1`
        );
      }
    }

    // Validate aspect ratio
    if (request.aspectRatio) {
      const validAspectRatios = ['16:9', '9:16', '1:1', '4:3'];
      if (!validAspectRatios.includes(request.aspectRatio)) {
        throw new ValidationError(
          `Aspect ratio must be one of: ${validAspectRatios.join(', ')}`
        );
      }
    }
  }

  /**
   * Map priority string to enum
   */
  private mapPriority(priority?: string): JobPriority {
    switch (priority?.toLowerCase()) {
      case 'high':
        return JobPriority.HIGH;
      case 'low':
        return JobPriority.LOW;
      default:
        return JobPriority.NORMAL;
    }
  }

  /**
   * Map job to response DTO
   */
  private mapJobToResponse(job: Job): VideoResultResponse {
    return {
      id: job.id,
      prompt: job.prompt,
      status: job.status,
      priority: job.priority,
      result: job.result
        ? {
            videoUrl: job.result.videoUrl,
            thumbnailUrl: job.result.thumbnailUrl,
            duration: job.result.duration,
            resolution: job.result.resolution,
            fileSize: job.result.fileSize,
            format: job.result.format,
          }
        : undefined,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    };
  }
}
