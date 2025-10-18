/**
 * Batch service interface
 */
import { Batch } from '../types/index.js';
import { BatchVideoRequest } from '../models/index.js';

export interface IBatchService {
  /**
   * Create a batch of video generation jobs
   */
  createBatch(request: BatchVideoRequest): Promise<Batch>;

  /**
   * Get batch status
   */
  getBatchStatus(batchId: string): Promise<Batch>;

  /**
   * Cancel a batch and all its jobs
   */
  cancelBatch(batchId: string): Promise<Batch>;

  /**
   * Process batch jobs (internal use)
   */
  processBatch(batchId: string): Promise<void>;

  /**
   * Update batch progress by checking job statuses
   */
  updateBatchProgress(batchId: string): Promise<Batch>;
}
