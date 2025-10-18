/**
 * Batch-related type definitions
 */

/**
 * Batch status enum
 */
export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIAL = 'partial', // Some jobs succeeded, some failed
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Batch progress information
 */
export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  cancelled: number;
  percentage: number;
}

/**
 * Batch model
 */
export interface Batch {
  id: string;
  name?: string;
  jobIds: string[];
  status: BatchStatus;
  progress: BatchProgress;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
