/**
 * In-memory implementation of job repository
 * Uses Map for storage - suitable for POC and development
 */
import { Job, JobStatus, isValidStatusTransition } from '../types/index.js';
import { IJobRepository, JobQueryOptions, PaginatedResult } from './IJobRepository.js';
import { ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

export class InMemoryJobRepository implements IJobRepository {
  private jobs: Map<string, Job> = new Map();

  /**
   * Create a new job
   */
  async create(job: Job): Promise<Job> {
    if (this.jobs.has(job.id)) {
      throw new ValidationError(`Job with id '${job.id}' already exists`);
    }

    this.jobs.set(job.id, { ...job });
    logger.debug({ jobId: job.id }, 'Job created in repository');
    return { ...job };
  }

  /**
   * Find job by ID
   */
  async findById(id: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  /**
   * Find all jobs with optional filtering
   */
  async findAll(options: JobQueryOptions = {}): Promise<PaginatedResult<Job>> {
    const {
      status,
      priority,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Filter jobs
    let filteredJobs = Array.from(this.jobs.values());

    if (status) {
      filteredJobs = filteredJobs.filter((job) => job.status === status);
    }

    if (priority) {
      filteredJobs = filteredJobs.filter((job) => job.priority === priority);
    }

    // Sort jobs
    filteredJobs.sort((a, b) => {
      const aValue = a[sortBy].getTime();
      const bValue = b[sortBy].getTime();
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // Paginate
    const total = filteredJobs.length;
    const paginatedJobs = filteredJobs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      data: paginatedJobs.map((job) => ({ ...job })),
      total,
      limit,
      offset,
      hasMore,
    };
  }

  /**
   * Find jobs by status
   */
  async findByStatus(status: JobStatus): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values()).filter((job) => job.status === status);
    return jobs.map((job) => ({ ...job }));
  }

  /**
   * Update a job
   */
  async update(id: string, updates: Partial<Job>): Promise<Job | null> {
    const existingJob = this.jobs.get(id);
    if (!existingJob) {
      return null;
    }

    // Validate status transition if status is being updated
    if (updates.status && updates.status !== existingJob.status) {
      if (!isValidStatusTransition(existingJob.status, updates.status)) {
        throw new ValidationError(
          `Invalid status transition from '${existingJob.status}' to '${updates.status}'`,
        );
      }
    }

    const updatedJob: Job = {
      ...existingJob,
      ...updates,
      id: existingJob.id, // Prevent ID updates
      createdAt: existingJob.createdAt, // Prevent createdAt updates
      updatedAt: new Date(),
    };

    this.jobs.set(id, updatedJob);
    logger.debug({ jobId: id, updates }, 'Job updated in repository');
    return { ...updatedJob };
  }

  /**
   * Delete a job
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.jobs.delete(id);
    if (deleted) {
      logger.debug({ jobId: id }, 'Job deleted from repository');
    }
    return deleted;
  }

  /**
   * Count jobs by status
   */
  async countByStatus(): Promise<Record<JobStatus, number>> {
    const counts: Record<JobStatus, number> = {
      [JobStatus.PENDING]: 0,
      [JobStatus.PROCESSING]: 0,
      [JobStatus.COMPLETED]: 0,
      [JobStatus.FAILED]: 0,
      [JobStatus.CANCELLED]: 0,
    };

    for (const job of this.jobs.values()) {
      counts[job.status]++;
    }

    return counts;
  }

  /**
   * Get total job count
   */
  async count(): Promise<number> {
    return this.jobs.size;
  }

  /**
   * Clear all jobs (useful for testing)
   */
  async clear(): Promise<void> {
    this.jobs.clear();
    logger.debug('All jobs cleared from repository');
  }
}
