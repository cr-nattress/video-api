/**
 * Job-related type definitions
 */

/**
 * Job status enum
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Job priority enum
 */
export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

/**
 * Video result data
 */
export interface VideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  resolution: string;
  fileSize?: number;
  format?: string;
}

/**
 * Job model
 */
export interface Job {
  id: string;
  prompt: string;
  status: JobStatus;
  priority: JobPriority;
  soraJobId?: string; // External Sora API job ID
  result?: VideoResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Valid job status transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.PENDING]: [JobStatus.PROCESSING, JobStatus.CANCELLED],
  [JobStatus.PROCESSING]: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED],
  [JobStatus.COMPLETED]: [],
  [JobStatus.FAILED]: [],
  [JobStatus.CANCELLED]: [],
};

/**
 * Type guard to check if a status transition is valid
 */
export function isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}
