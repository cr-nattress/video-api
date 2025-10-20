/**
 * Mock Sora API client for testing and development
 */
import { randomUUID } from 'crypto';
import { ISoraClient } from './ISoraClient.js';
import {
  SoraVideoRequest,
  SoraJobResponse,
  SoraCreateResponse,
  SoraJobStatus,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../errors/index.js';

/**
 * Mock job storage
 */
interface MockJob {
  id: string;
  request: SoraVideoRequest;
  status: SoraJobStatus;
  createdAt: Date;
}

export class MockSoraClient implements ISoraClient {
  private jobs: Map<string, MockJob> = new Map();
  private autoCompleteDelay: number = 5000; // 5 seconds

  /**
   * Create a new video generation job
   */
  async createVideo(request: SoraVideoRequest): Promise<SoraCreateResponse> {
    const jobId = `task_${randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

    const mockJob: MockJob = {
      id: jobId,
      request,
      status: 'queued',
      createdAt: new Date(),
    };

    this.jobs.set(jobId, mockJob);

    logger.info({ jobId, prompt: request.prompt }, 'Mock video creation job initiated');

    // Simulate async processing
    this.simulateProcessing(jobId);

    // Return v1 API format
    const width = request.width || 1080;
    const height = request.height || 1080;
    const n_seconds = request.n_seconds || request.duration || 10;

    return {
      object: 'video.generation.job',
      id: jobId,
      status: 'queued',
      created_at: Math.floor(mockJob.createdAt.getTime() / 1000),
      finished_at: null,
      expires_at: null,
      generations: [],
      prompt: request.prompt,
      model: 'sora-1-turbo',
      n_variants: request.n_variants || 1,
      n_seconds,
      height,
      width,
      failure_reason: null,
    };
  }

  /**
   * Get video generation job status
   */
  async getVideoStatus(jobId: string): Promise<SoraJobResponse> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new NotFoundError('Video job', jobId);
    }

    const width = job.request.width || 1080;
    const height = job.request.height || 1080;
    const n_seconds = job.request.n_seconds || job.request.duration || 10;

    const response: SoraJobResponse = {
      object: 'video.generation.job',
      id: job.id,
      status: job.status,
      created_at: Math.floor(job.createdAt.getTime() / 1000),
      finished_at: job.status === 'completed' || job.status === 'failed' ? Math.floor(Date.now() / 1000) : null,
      expires_at: job.status === 'completed' ? Math.floor(Date.now() / 1000) + 86400 : null, // 24 hours
      generations: [],
      prompt: job.request.prompt,
      model: 'sora-1-turbo',
      n_variants: job.request.n_variants || 1,
      n_seconds,
      height,
      width,
      failure_reason: null,
    };

    // Add generation if completed
    if (job.status === 'completed') {
      response.generations = [
        {
          id: `gen_${randomUUID().substring(0, 8)}`,
          video_url: `https://mock-storage.example.com/videos/${jobId}.mp4`,
        },
      ];
    }

    // Add failure reason if failed
    if (job.status === 'failed') {
      response.failure_reason = 'Mock processing error for testing';
    }

    logger.debug({ jobId, status: job.status }, 'Mock video status fetched');

    return response;
  }

  /**
   * Cancel a video generation job
   */
  async cancelVideo(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new NotFoundError('Video job', jobId);
    }

    job.status = 'cancelled';
    logger.info({ jobId }, 'Mock video cancelled');
  }

  /**
   * Health check for Sora API
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Simulate async video processing
   */
  private simulateProcessing(jobId: string): void {
    // Transition from queued to in_progress after 1 second
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job && job.status === 'queued') {
        job.status = 'in_progress';
        logger.debug({ jobId }, 'Mock job status changed to in_progress');
      }
    }, 1000);

    // Complete after delay
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job && job.status === 'in_progress') {
        // 90% success rate for mock
        job.status = Math.random() > 0.1 ? 'completed' : 'failed';
        logger.debug({ jobId, status: job.status }, 'Mock job completed');
      }
    }, this.autoCompleteDelay);
  }

  /**
   * Clear all mock jobs (for testing)
   */
  clearJobs(): void {
    this.jobs.clear();
  }
}
