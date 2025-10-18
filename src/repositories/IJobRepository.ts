/**
 * Job repository interface
 * Defines contract for job data access layer
 */
import { Job, JobStatus } from '../types/index.js';

/**
 * Query options for finding jobs
 */
export interface JobQueryOptions {
  status?: JobStatus;
  priority?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Job repository interface
 */
export interface IJobRepository {
  /**
   * Create a new job
   */
  create(job: Job): Promise<Job>;

  /**
   * Find job by ID
   */
  findById(id: string): Promise<Job | null>;

  /**
   * Find all jobs with optional filtering
   */
  findAll(options?: JobQueryOptions): Promise<PaginatedResult<Job>>;

  /**
   * Find jobs by status
   */
  findByStatus(status: JobStatus): Promise<Job[]>;

  /**
   * Update a job
   */
  update(id: string, updates: Partial<Job>): Promise<Job | null>;

  /**
   * Delete a job
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count jobs by status
   */
  countByStatus(): Promise<Record<JobStatus, number>>;

  /**
   * Get total job count
   */
  count(): Promise<number>;
}
