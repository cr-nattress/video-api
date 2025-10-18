/**
 * Batch processing service
 * Handles batch video generation with parallel processing
 */
import { IBatchService } from './IBatchService.js';
import { IVideoService } from './IVideoService.js';
import { IJobRepository } from '../repositories/index.js';
import { Batch, BatchStatus, JobStatus } from '../types/index.js';
import { BatchVideoRequest } from '../models/index.js';
import { createBatch, updateBatchProgress, updateBatchStatus } from '../models/Batch.js';
import { NotFoundError, ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

export class BatchService implements IBatchService {
  private batches: Map<string, Batch> = new Map();
  private maxConcurrency: number = 5; // Process 5 jobs at a time

  constructor(
    private videoService: IVideoService,
    private jobRepository: IJobRepository,
  ) {}

  /**
   * Create a batch of video generation jobs
   */
  async createBatch(request: BatchVideoRequest): Promise<Batch> {
    // Validate request
    this.validateBatchRequest(request);

    logger.info(
      { videoCount: request.videos.length, name: request.name },
      'Creating video batch',
    );

    // Create jobs for each video
    const jobIds: string[] = [];

    for (const videoRequest of request.videos) {
      try {
        const job = await this.videoService.createVideo({
          ...videoRequest,
          priority: request.priority || videoRequest.priority,
        });
        jobIds.push(job.id);
      } catch (error) {
        logger.error({ error, videoRequest }, 'Failed to create job in batch');
        // Continue creating other jobs even if one fails
      }
    }

    if (jobIds.length === 0) {
      throw new ValidationError('Failed to create any jobs in the batch');
    }

    // Create batch
    const batch = createBatch(jobIds, request.name);
    this.batches.set(batch.id, batch);

    logger.info(
      { batchId: batch.id, totalJobs: jobIds.length },
      'Batch created successfully',
    );

    return batch;
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string): Promise<Batch> {
    const batch = this.batches.get(batchId);

    if (!batch) {
      throw new NotFoundError('Batch', batchId);
    }

    // Update progress before returning
    return this.updateBatchProgress(batchId);
  }

  /**
   * Cancel a batch and all its jobs
   */
  async cancelBatch(batchId: string): Promise<Batch> {
    const batch = await this.getBatchStatus(batchId);

    if (batch.status === BatchStatus.COMPLETED || batch.status === BatchStatus.CANCELLED) {
      throw new ValidationError(`Cannot cancel batch with status: ${batch.status}`);
    }

    logger.info({ batchId, jobCount: batch.jobIds.length }, 'Cancelling batch');

    // Cancel all jobs
    const cancelPromises = batch.jobIds.map(async (jobId) => {
      try {
        await this.videoService.cancelVideo(jobId);
      } catch (error) {
        logger.warn({ jobId, error }, 'Failed to cancel job in batch');
      }
    });

    await Promise.allSettled(cancelPromises);

    // Update batch status
    const updatedBatch = updateBatchStatus(batch, BatchStatus.CANCELLED);
    this.batches.set(batchId, updatedBatch);

    logger.info({ batchId }, 'Batch cancelled');

    return updatedBatch;
  }

  /**
   * Process batch jobs (internal use - not exposed via interface)
   */
  async processBatch(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId);

    if (!batch) {
      throw new NotFoundError('Batch', batchId);
    }

    logger.info({ batchId, jobCount: batch.jobIds.length }, 'Processing batch');

    // Process jobs in chunks with concurrency limit
    const jobIds = [...batch.jobIds];
    const chunks: string[][] = [];

    for (let i = 0; i < jobIds.length; i += this.maxConcurrency) {
      chunks.push(jobIds.slice(i, i + this.maxConcurrency));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (jobId) => {
        try {
          await this.videoService.syncJobStatus(jobId);
        } catch (error) {
          logger.error({ jobId, error }, 'Error processing job in batch');
        }
      });

      await Promise.allSettled(promises);

      // Update progress after each chunk
      await this.updateBatchProgress(batchId);
    }

    logger.info({ batchId }, 'Batch processing completed');
  }

  /**
   * Update batch progress by checking job statuses
   */
  async updateBatchProgress(batchId: string): Promise<Batch> {
    const batch = this.batches.get(batchId);

    if (!batch) {
      throw new NotFoundError('Batch', batchId);
    }

    // Get current status of all jobs
    const statusCounts = {
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      cancelled: 0,
    };

    for (const jobId of batch.jobIds) {
      try {
        const job = await this.jobRepository.findById(jobId);
        if (job) {
          switch (job.status) {
            case JobStatus.COMPLETED:
              statusCounts.completed++;
              break;
            case JobStatus.FAILED:
              statusCounts.failed++;
              break;
            case JobStatus.PENDING:
              statusCounts.pending++;
              break;
            case JobStatus.PROCESSING:
              statusCounts.processing++;
              break;
            case JobStatus.CANCELLED:
              statusCounts.cancelled++;
              break;
          }
        }
      } catch (error) {
        logger.warn({ jobId, error }, 'Failed to get job status');
      }
    }

    // Update batch with new progress
    const updatedBatch = updateBatchProgress(
      batch,
      statusCounts.completed,
      statusCounts.failed,
      statusCounts.pending,
      statusCounts.processing,
      statusCounts.cancelled,
    );

    this.batches.set(batchId, updatedBatch);

    return updatedBatch;
  }

  /**
   * Validate batch request
   */
  private validateBatchRequest(request: BatchVideoRequest): void {
    if (!request.videos || request.videos.length === 0) {
      throw new ValidationError('At least one video is required in the batch');
    }

    if (request.videos.length > 10) {
      throw new ValidationError('Maximum 10 videos allowed per batch');
    }

    // Validate each video request
    for (let i = 0; i < request.videos.length; i++) {
      const video = request.videos[i];
      if (!video.prompt || video.prompt.trim().length === 0) {
        throw new ValidationError(`Video at index ${i} is missing a prompt`);
      }
    }
  }

  /**
   * Get all batches (for testing/debugging)
   */
  getAllBatches(): Batch[] {
    return Array.from(this.batches.values());
  }

  /**
   * Clear all batches (for testing)
   */
  clearBatches(): void {
    this.batches.clear();
  }
}
