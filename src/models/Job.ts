/**
 * Job model factory functions
 */
import { randomUUID } from 'crypto';
import { Job, JobStatus, JobPriority, VideoResult } from '../types/index.js';

/**
 * Create a new job
 */
export function createJob(
  prompt: string,
  priority: JobPriority = JobPriority.NORMAL,
  metadata?: Record<string, unknown>,
): Job {
  const now = new Date();
  return {
    id: `job_${randomUUID()}`,
    prompt,
    status: JobStatus.PENDING,
    priority,
    createdAt: now,
    updatedAt: now,
    metadata,
  };
}

/**
 * Update job status
 */
export function updateJobStatus(job: Job, status: JobStatus, error?: string): Job {
  const now = new Date();
  const updates: Partial<Job> = {
    status,
    updatedAt: now,
  };

  if (status === JobStatus.PROCESSING && !job.startedAt) {
    updates.startedAt = now;
  }

  if (
    status === JobStatus.COMPLETED ||
    status === JobStatus.FAILED ||
    status === JobStatus.CANCELLED
  ) {
    updates.completedAt = now;
  }

  if (error) {
    updates.error = error;
  }

  return { ...job, ...updates };
}

/**
 * Update job with result
 */
export function updateJobResult(job: Job, result: VideoResult): Job {
  return {
    ...job,
    result,
    status: JobStatus.COMPLETED,
    updatedAt: new Date(),
    completedAt: new Date(),
  };
}

/**
 * Update job with Sora job ID
 */
export function updateJobSoraId(job: Job, soraJobId: string): Job {
  return {
    ...job,
    soraJobId,
    updatedAt: new Date(),
  };
}
