/**
 * Video service interface
 */
import { Job } from '../types/index.js';
import { CreateVideoRequest, VideoResultResponse } from '../models/index.js';

export interface IVideoService {
  /**
   * Create a new video generation job
   */
  createVideo(request: CreateVideoRequest): Promise<Job>;

  /**
   * Get video job status
   */
  getVideoStatus(jobId: string): Promise<Job>;

  /**
   * Get video result (only if completed)
   */
  getVideoResult(jobId: string): Promise<VideoResultResponse>;

  /**
   * Cancel a video generation job
   */
  cancelVideo(jobId: string): Promise<Job>;

  /**
   * Sync job status with Sora API
   */
  syncJobStatus(jobId: string): Promise<Job>;

  /**
   * List all jobs with optional filtering
   */
  listJobs(options?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: Job[]; total: number; hasMore: boolean }>;
}
