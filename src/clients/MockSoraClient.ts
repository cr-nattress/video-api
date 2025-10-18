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
    const jobId = `sora_${randomUUID()}`;

    const mockJob: MockJob = {
      id: jobId,
      request,
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(jobId, mockJob);

    logger.info({ jobId, prompt: request.prompt }, 'Mock video creation job initiated');

    // Simulate async processing
    this.simulateProcessing(jobId);

    return {
      id: jobId,
      status: 'pending',
      message: 'Video generation job created successfully (mock)',
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

    const response: SoraJobResponse = {
      id: job.id,
      status: job.status,
      prompt: job.request.prompt,
      createdAt: job.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (job.status === 'completed') {
      response.result = {
        url: `https://mock-storage.example.com/videos/${jobId}.mp4`,
        thumbnailUrl: `https://mock-storage.example.com/thumbnails/${jobId}.jpg`,
        duration: job.request.duration || 10,
        resolution: job.request.resolution || '1080p',
        fileSize: 15728640, // 15 MB
        format: 'mp4',
      };
      response.completedAt = new Date().toISOString();
    }

    if (job.status === 'failed') {
      response.error = {
        code: 'PROCESSING_ERROR',
        message: 'Mock processing error for testing',
      };
      response.completedAt = new Date().toISOString();
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
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job && job.status === 'pending') {
        job.status = 'processing';
        logger.debug({ jobId }, 'Mock job status changed to processing');
      }
    }, 1000);

    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job && job.status === 'processing') {
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
