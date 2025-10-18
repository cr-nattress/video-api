/**
 * Batch model factory functions
 */
import { randomUUID } from 'crypto';
import { Batch, BatchStatus, BatchProgress } from '../types/index.js';

/**
 * Calculate batch progress
 */
export function calculateBatchProgress(
  total: number,
  completed: number,
  failed: number,
  pending: number,
  processing: number,
  cancelled: number,
): BatchProgress {
  const percentage = total > 0 ? Math.round(((completed + failed + cancelled) / total) * 100) : 0;

  return {
    total,
    completed,
    failed,
    pending,
    processing,
    cancelled,
    percentage,
  };
}

/**
 * Create a new batch
 */
export function createBatch(jobIds: string[], name?: string): Batch {
  const now = new Date();
  const progress = calculateBatchProgress(jobIds.length, 0, 0, jobIds.length, 0, 0);

  return {
    id: `batch_${randomUUID()}`,
    name,
    jobIds,
    status: BatchStatus.PENDING,
    progress,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update batch progress
 */
export function updateBatchProgress(
  batch: Batch,
  completed: number,
  failed: number,
  pending: number,
  processing: number,
  cancelled: number,
): Batch {
  const progress = calculateBatchProgress(
    batch.jobIds.length,
    completed,
    failed,
    pending,
    processing,
    cancelled,
  );

  // Determine batch status
  let status = batch.status;
  if (progress.percentage === 100) {
    if (failed > 0 || cancelled > 0) {
      status = BatchStatus.PARTIAL;
    } else {
      status = BatchStatus.COMPLETED;
    }
  } else if (processing > 0) {
    status = BatchStatus.PROCESSING;
  }

  return {
    ...batch,
    status,
    progress,
    updatedAt: new Date(),
    ...(progress.percentage === 100 && !batch.completedAt && { completedAt: new Date() }),
  };
}

/**
 * Update batch status
 */
export function updateBatchStatus(batch: Batch, status: BatchStatus): Batch {
  return {
    ...batch,
    status,
    updatedAt: new Date(),
    ...(status === BatchStatus.COMPLETED && !batch.completedAt && { completedAt: new Date() }),
  };
}
