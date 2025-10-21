/**
 * Sora API client interface
 */
import { SoraVideoRequest, SoraJobResponse, SoraCreateResponse } from '../types/index.js';

/**
 * Sora API client interface
 */
export interface ISoraClient {
  /**
   * Create a new video generation job
   * @param request - Sora video request parameters
   * @param internalJobId - Optional internal job ID for logging purposes
   */
  createVideo(request: SoraVideoRequest, internalJobId?: string): Promise<SoraCreateResponse>;

  /**
   * Get video generation job status
   */
  getVideoStatus(jobId: string): Promise<SoraJobResponse>;

  /**
   * Cancel a video generation job
   */
  cancelVideo(jobId: string): Promise<void>;

  /**
   * Health check for Sora API
   */
  healthCheck(): Promise<boolean>;
}
