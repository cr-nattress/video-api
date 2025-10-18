# User Story: US-006 - Job Repository Implementation

## Story Description
**As a** developer
**I want** a job repository for managing job data
**So that** I can store, retrieve, and query video generation jobs

## Acceptance Criteria
- [ ] In-memory job storage using Map
- [ ] CRUD operations implemented (create, findById, findAll, update, delete)
- [ ] Job status transitions validated
- [ ] Query filtering by status, priority, date range
- [ ] Pagination support
- [ ] Sorting by multiple fields
- [ ] Concurrent access handling
- [ ] Repository interface for future database implementations

## Story Points
3

## Priority
Must Have (P0)

## Dependencies
- US-001 (Project Foundation)
- US-005 (Type Definitions & Models)

## Technical Notes
- Use Map for in-memory storage (easy migration to database later)
- Implement repository pattern for abstraction
- Thread-safe operations for concurrent access
- Validate status transitions
- Support complex queries

---

## Task Prompts

### Task 1: Create Repository Interface
```
Create src/repositories/interfaces/IJobRepository.ts with repository contract:

/**
 * Job repository interface
 * Defines contract for job data access
 */
import { Job, JobStatus } from '../../types/job.js';

/**
 * Query options for finding jobs
 */
export interface FindJobsOptions {
  status?: JobStatus;
  priority?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
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
   * Find job by Sora job ID
   */
  findBySoraJobId(soraJobId: string): Promise<Job | null>;

  /**
   * Find all jobs with optional filtering and pagination
   */
  findAll(options?: FindJobsOptions): Promise<PaginatedResult<Job>>;

  /**
   * Update an existing job
   */
  update(id: string, updates: Partial<Job>): Promise<Job | null>;

  /**
   * Delete a job by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count jobs by status
   */
  countByStatus(status: JobStatus): Promise<number>;

  /**
   * Get all jobs by status
   */
  findByStatus(status: JobStatus): Promise<Job[]>;

  /**
   * Check if job exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Clear all jobs (for testing)
   */
  clear(): Promise<void>;
}
```

### Task 2: Create In-Memory Repository Implementation
```
Create src/repositories/InMemoryJobRepository.ts:

/**
 * In-memory job repository implementation
 * Uses Map for fast lookups and operations
 */
import { Job, JobStatus } from '../types/job.js';
import {
  IJobRepository,
  FindJobsOptions,
  PaginatedResult,
} from './interfaces/IJobRepository.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ConflictError } from '../middleware/errors/index.js';

/**
 * In-memory implementation of job repository
 */
export class InMemoryJobRepository implements IJobRepository {
  private jobs: Map<string, Job>;
  private soraJobIdIndex: Map<string, string>; // soraJobId -> jobId

  constructor() {
    this.jobs = new Map();
    this.soraJobIdIndex = new Map();
    logger.info('InMemoryJobRepository initialized');
  }

  /**
   * Create a new job
   */
  async create(job: Job): Promise<Job> {
    if (this.jobs.has(job.id)) {
      throw new ConflictError(`Job with ID ${job.id} already exists`);
    }

    this.jobs.set(job.id, { ...job });

    if (job.soraJobId) {
      this.soraJobIdIndex.set(job.soraJobId, job.id);
    }

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
   * Find job by Sora job ID
   */
  async findBySoraJobId(soraJobId: string): Promise<Job | null> {
    const jobId = this.soraJobIdIndex.get(soraJobId);
    if (!jobId) return null;

    return this.findById(jobId);
  }

  /**
   * Find all jobs with filtering and pagination
   */
  async findAll(options: FindJobsOptions = {}): Promise<PaginatedResult<Job>> {
    const {
      status,
      priority,
      createdAfter,
      createdBefore,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Filter jobs
    let filteredJobs = Array.from(this.jobs.values()).filter((job) => {
      if (status && job.status !== status) return false;
      if (priority && job.priority !== priority) return false;
      if (createdAfter && job.createdAt < createdAfter) return false;
      if (createdBefore && job.createdAt > createdBefore) return false;
      return true;
    });

    // Sort jobs
    filteredJobs.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      let comparison = 0;
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Calculate pagination
    const total = filteredJobs.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Paginate results
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

    return {
      data: paginatedJobs.map((job) => ({ ...job })),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Update an existing job
   */
  async update(id: string, updates: Partial<Job>): Promise<Job | null> {
    const existingJob = this.jobs.get(id);
    if (!existingJob) {
      return null;
    }

    // Validate status transitions
    if (updates.status && !this.isValidStatusTransition(existingJob.status, updates.status)) {
      throw new ConflictError(
        `Invalid status transition from ${existingJob.status} to ${updates.status}`
      );
    }

    // Update the job
    const updatedJob: Job = {
      ...existingJob,
      ...updates,
      id: existingJob.id, // Ensure ID cannot be changed
      updatedAt: new Date(),
    };

    this.jobs.set(id, updatedJob);

    // Update soraJobId index if changed
    if (updates.soraJobId && updates.soraJobId !== existingJob.soraJobId) {
      if (existingJob.soraJobId) {
        this.soraJobIdIndex.delete(existingJob.soraJobId);
      }
      this.soraJobIdIndex.set(updates.soraJobId, id);
    }

    logger.debug({ jobId: id, updates }, 'Job updated in repository');
    return { ...updatedJob };
  }

  /**
   * Delete a job by ID
   */
  async delete(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job) return false;

    this.jobs.delete(id);

    if (job.soraJobId) {
      this.soraJobIdIndex.delete(job.soraJobId);
    }

    logger.debug({ jobId: id }, 'Job deleted from repository');
    return true;
  }

  /**
   * Count jobs by status
   */
  async countByStatus(status: JobStatus): Promise<number> {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === status) count++;
    }
    return count;
  }

  /**
   * Get all jobs by status
   */
  async findByStatus(status: JobStatus): Promise<Job[]> {
    const jobs: Job[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === status) {
        jobs.push({ ...job });
      }
    }
    return jobs;
  }

  /**
   * Check if job exists
   */
  async exists(id: string): Promise<boolean> {
    return this.jobs.has(id);
  }

  /**
   * Clear all jobs (for testing)
   */
  async clear(): Promise<void> {
    this.jobs.clear();
    this.soraJobIdIndex.clear();
    logger.debug('Repository cleared');
  }

  /**
   * Get repository statistics
   */
  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      total: this.jobs.size,
    };

    for (const status of Object.values(JobStatus)) {
      stats[status] = await this.countByStatus(status);
    }

    return stats;
  }

  /**
   * Validate status transitions
   */
  private isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      [JobStatus.PENDING]: [JobStatus.PROCESSING, JobStatus.CANCELLED],
      [JobStatus.PROCESSING]: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED],
      [JobStatus.COMPLETED]: [], // Terminal state
      [JobStatus.FAILED]: [], // Terminal state
      [JobStatus.CANCELLED]: [], // Terminal state
    };

    return validTransitions[from].includes(to);
  }
}
```

### Task 3: Create Repository Factory
```
Create src/repositories/index.ts:

/**
 * Repository factory and exports
 * Central point for repository instantiation
 */
import { IJobRepository } from './interfaces/IJobRepository.js';
import { InMemoryJobRepository } from './InMemoryJobRepository.js';
import { logger } from '../utils/logger.js';

let jobRepositoryInstance: IJobRepository | null = null;

/**
 * Get job repository singleton instance
 */
export function getJobRepository(): IJobRepository {
  if (!jobRepositoryInstance) {
    // For now, always use in-memory repository
    // In future, this could be database-backed based on configuration
    jobRepositoryInstance = new InMemoryJobRepository();
    logger.info('Job repository instance created');
  }

  return jobRepositoryInstance;
}

/**
 * Reset repository (for testing)
 */
export function resetJobRepository(): void {
  jobRepositoryInstance = null;
}

// Re-export types and interfaces
export * from './interfaces/IJobRepository.js';
export { InMemoryJobRepository } from './InMemoryJobRepository.js';
```

### Task 4: Create Repository Tests
```
Create tests/unit/repositories/InMemoryJobRepository.test.ts:

/**
 * Tests for InMemoryJobRepository
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { InMemoryJobRepository } from '../../../src/repositories/InMemoryJobRepository';
import { createJob } from '../../../src/models/factories/job.factory';
import { JobStatus, JobPriority } from '../../../src/types/job';

describe('InMemoryJobRepository', () => {
  let repository: InMemoryJobRepository;

  beforeEach(async () => {
    repository = new InMemoryJobRepository();
  });

  describe('create', () => {
    it('should create a new job', async () => {
      const job = createJob('test prompt');
      const created = await repository.create(job);

      expect(created.id).toBe(job.id);
      expect(created.prompt).toBe('test prompt');
    });

    it('should throw ConflictError for duplicate ID', async () => {
      const job = createJob('test prompt');
      await repository.create(job);

      await expect(repository.create(job)).rejects.toThrow('already exists');
    });
  });

  describe('findById', () => {
    it('should find job by ID', async () => {
      const job = createJob('test prompt');
      await repository.create(job);

      const found = await repository.findById(job.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(job.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findBySoraJobId', () => {
    it('should find job by Sora job ID', async () => {
      const job = createJob('test prompt');
      job.soraJobId = 'sora-123';
      await repository.create(job);

      const found = await repository.findBySoraJobId('sora-123');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(job.id);
    });

    it('should return null for non-existent Sora job ID', async () => {
      const found = await repository.findBySoraJobId('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test jobs
      const job1 = createJob('test 1', JobPriority.HIGH);
      job1.status = JobStatus.COMPLETED;
      await repository.create(job1);

      const job2 = createJob('test 2', JobPriority.NORMAL);
      job2.status = JobStatus.PENDING;
      await repository.create(job2);

      const job3 = createJob('test 3', JobPriority.LOW);
      job3.status = JobStatus.PROCESSING;
      await repository.create(job3);
    });

    it('should return all jobs without filters', async () => {
      const result = await repository.findAll();

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should filter by status', async () => {
      const result = await repository.findAll({ status: JobStatus.PENDING });

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe(JobStatus.PENDING);
    });

    it('should paginate results', async () => {
      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data.length).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(true);
    });

    it('should sort by createdAt descending', async () => {
      const result = await repository.findAll({
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        result.data[1].createdAt.getTime()
      );
    });
  });

  describe('update', () => {
    it('should update job', async () => {
      const job = createJob('test prompt');
      await repository.create(job);

      const updated = await repository.update(job.id, {
        status: JobStatus.PROCESSING,
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe(JobStatus.PROCESSING);
    });

    it('should return null for non-existent job', async () => {
      const updated = await repository.update('non-existent', {
        status: JobStatus.PROCESSING,
      });

      expect(updated).toBeNull();
    });

    it('should validate status transitions', async () => {
      const job = createJob('test prompt');
      job.status = JobStatus.COMPLETED;
      await repository.create(job);

      await expect(
        repository.update(job.id, { status: JobStatus.PENDING })
      ).rejects.toThrow('Invalid status transition');
    });

    it('should not allow ID to be changed', async () => {
      const job = createJob('test prompt');
      await repository.create(job);

      const updated = await repository.update(job.id, {
        id: 'new-id',
      } as any);

      expect(updated?.id).toBe(job.id);
    });
  });

  describe('delete', () => {
    it('should delete job', async () => {
      const job = createJob('test prompt');
      await repository.create(job);

      const deleted = await repository.delete(job.id);

      expect(deleted).toBe(true);
      expect(await repository.findById(job.id)).toBeNull();
    });

    it('should return false for non-existent job', async () => {
      const deleted = await repository.delete('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('countByStatus', () => {
    it('should count jobs by status', async () => {
      const job1 = createJob('test 1');
      job1.status = JobStatus.PENDING;
      await repository.create(job1);

      const job2 = createJob('test 2');
      job2.status = JobStatus.PENDING;
      await repository.create(job2);

      const count = await repository.countByStatus(JobStatus.PENDING);

      expect(count).toBe(2);
    });
  });

  describe('findByStatus', () => {
    it('should find all jobs by status', async () => {
      const job1 = createJob('test 1');
      job1.status = JobStatus.PROCESSING;
      await repository.create(job1);

      const job2 = createJob('test 2');
      job2.status = JobStatus.PROCESSING;
      await repository.create(job2);

      const jobs = await repository.findByStatus(JobStatus.PROCESSING);

      expect(jobs.length).toBe(2);
      expect(jobs.every((j) => j.status === JobStatus.PROCESSING)).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true if job exists', async () => {
      const job = createJob('test prompt');
      await repository.create(job);

      expect(await repository.exists(job.id)).toBe(true);
    });

    it('should return false if job does not exist', async () => {
      expect(await repository.exists('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all jobs', async () => {
      await repository.create(createJob('test 1'));
      await repository.create(createJob('test 2'));

      await repository.clear();

      const result = await repository.findAll();
      expect(result.data.length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return repository statistics', async () => {
      const job1 = createJob('test 1');
      job1.status = JobStatus.PENDING;
      await repository.create(job1);

      const job2 = createJob('test 2');
      job2.status = JobStatus.COMPLETED;
      await repository.create(job2);

      const stats = await repository.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
    });
  });
});
```

### Task 5: Create Status Transition Tests
```
Create tests/unit/repositories/statusTransitions.test.ts:

/**
 * Tests for job status transitions
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { InMemoryJobRepository } from '../../../src/repositories/InMemoryJobRepository';
import { createJob } from '../../../src/models/factories/job.factory';
import { JobStatus } from '../../../src/types/job';

describe('Job Status Transitions', () => {
  let repository: InMemoryJobRepository;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
  });

  it('should allow PENDING -> PROCESSING', async () => {
    const job = createJob('test');
    job.status = JobStatus.PENDING;
    await repository.create(job);

    await expect(
      repository.update(job.id, { status: JobStatus.PROCESSING })
    ).resolves.not.toThrow();
  });

  it('should allow PENDING -> CANCELLED', async () => {
    const job = createJob('test');
    job.status = JobStatus.PENDING;
    await repository.create(job);

    await expect(
      repository.update(job.id, { status: JobStatus.CANCELLED })
    ).resolves.not.toThrow();
  });

  it('should allow PROCESSING -> COMPLETED', async () => {
    const job = createJob('test');
    job.status = JobStatus.PROCESSING;
    await repository.create(job);

    await expect(
      repository.update(job.id, { status: JobStatus.COMPLETED })
    ).resolves.not.toThrow();
  });

  it('should allow PROCESSING -> FAILED', async () => {
    const job = createJob('test');
    job.status = JobStatus.PROCESSING;
    await repository.create(job);

    await expect(
      repository.update(job.id, { status: JobStatus.FAILED })
    ).resolves.not.toThrow();
  });

  it('should not allow COMPLETED -> any status', async () => {
    const job = createJob('test');
    job.status = JobStatus.COMPLETED;
    await repository.create(job);

    await expect(
      repository.update(job.id, { status: JobStatus.PENDING })
    ).rejects.toThrow('Invalid status transition');
  });

  it('should not allow FAILED -> any status', async () => {
    const job = createJob('test');
    job.status = JobStatus.FAILED;
    await repository.create(job);

    await expect(
      repository.update(job.id, { status: JobStatus.PENDING })
    ).rejects.toThrow('Invalid status transition');
  });

  it('should not allow CANCELLED -> any status', async () => {
    const job = createJob('test');
    job.status = JobStatus.CANCELLED;
    await repository.create(job);

    await expect(
      repository.update(job.id, { status: JobStatus.PENDING })
    ).rejects.toThrow('Invalid status transition');
  });
});
```

### Task 6: Add JSDoc Comments
```
Ensure all repository classes and methods have comprehensive JSDoc:
- Document all methods with parameters and return types
- Include usage examples
- Document thrown errors
- Add complexity notes for performance-sensitive methods
```

### Task 7: Run Linting and Formatting
```
Run quality checks:

npm run lint:fix
npm run format
npm run type-check

Verify no errors:
npm run lint
npm run format:check
```

### Task 8: Create Documentation
```
Create /docs/US-006-repository-guide.md:

# Job Repository Guide

## Overview
The job repository provides data access layer for managing video generation jobs.

## Architecture

### Repository Pattern
The repository pattern abstracts data access, allowing easy swapping of storage implementations (in-memory, database, etc.).

### Interface
All repositories implement `IJobRepository` interface, ensuring consistent API.

## In-Memory Repository

### Features
- Fast Map-based storage
- O(1) lookups by ID
- Secondary index for Sora job IDs
- Thread-safe operations
- Status transition validation
- Filtering and pagination
- Multiple sort options

### Usage

#### Getting Repository Instance
\`\`\`typescript
import { getJobRepository } from './repositories';

const repository = getJobRepository();
\`\`\`

#### Creating Jobs
\`\`\`typescript
import { createJob } from './models/factories/job.factory';

const job = createJob('A beautiful sunset', JobPriority.HIGH);
const created = await repository.create(job);
\`\`\`

#### Finding Jobs
\`\`\`typescript
// By ID
const job = await repository.findById('job-123');

// By Sora job ID
const job = await repository.findBySoraJobId('sora-456');

// By status
const jobs = await repository.findByStatus(JobStatus.PENDING);

// With filters
const result = await repository.findAll({
  status: JobStatus.COMPLETED,
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
\`\`\`

#### Updating Jobs
\`\`\`typescript
const updated = await repository.update(jobId, {
  status: JobStatus.COMPLETED,
  result: {
    videoUrl: 'https://...',
    duration: 10,
    width: 1920,
    height: 1080,
    format: 'mp4',
  },
});
\`\`\`

#### Deleting Jobs
\`\`\`typescript
const deleted = await repository.delete(jobId);
\`\`\`

## Status Transitions

### Valid Transitions
- PENDING → PROCESSING, CANCELLED
- PROCESSING → COMPLETED, FAILED, CANCELLED
- COMPLETED → (terminal, no transitions)
- FAILED → (terminal, no transitions)
- CANCELLED → (terminal, no transitions)

### Validation
Status transitions are automatically validated. Invalid transitions throw `ConflictError`.

## Filtering and Pagination

### Filter Options
\`\`\`typescript
interface FindJobsOptions {
  status?: JobStatus;
  priority?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}
\`\`\`

### Pagination Response
\`\`\`typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
\`\`\```

### Example
\`\`\`typescript
const result = await repository.findAll({
  status: JobStatus.COMPLETED,
  createdAfter: new Date('2024-01-01'),
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});

console.log(\`Found \${result.total} jobs\`);
console.log(\`Page \${result.page} of \${result.totalPages}\`);
\`\`\`

## Indexes

### Primary Index
- Key: job.id
- Type: Map
- Complexity: O(1)

### Secondary Index
- Key: job.soraJobId
- Type: Map (soraJobId → jobId)
- Complexity: O(1)

## Statistics

Get repository statistics:
\`\`\`typescript
const stats = await repository.getStats();
// {
//   total: 100,
//   pending: 20,
//   processing: 10,
//   completed: 65,
//   failed: 3,
//   cancelled: 2
// }
\`\`\`

## Future Database Implementation

### Migrating to Database
1. Create new class implementing `IJobRepository`
2. Implement all interface methods
3. Update `getJobRepository()` factory
4. No changes needed in consuming code

### Example
\`\`\`typescript
export class PostgresJobRepository implements IJobRepository {
  async create(job: Job): Promise<Job> {
    // Database implementation
  }
  // ... other methods
}

export function getJobRepository(): IJobRepository {
  if (config.database.enabled) {
    return new PostgresJobRepository();
  }
  return new InMemoryJobRepository();
}
\`\`\`

## Best Practices

1. **Always use repository methods** - Don't access storage directly
2. **Validate before update** - Repository validates status transitions
3. **Use pagination** - Always paginate large result sets
4. **Handle null returns** - findById can return null
5. **Check exists** - Before operations, check if job exists
6. **Use indexes** - findBySoraJobId is optimized

## Testing

### Setup
\`\`\`typescript
let repository: InMemoryJobRepository;

beforeEach(() => {
  repository = new InMemoryJobRepository();
});
\`\`\`

### Cleanup
\`\`\`typescript
afterEach(async () => {
  await repository.clear();
});
\`\`\`
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors
- [ ] All methods have JSDoc
- [ ] No use of `any` type

### Testing
- [ ] Unit tests for all CRUD operations
- [ ] Tests for filtering and pagination
- [ ] Tests for status transitions
- [ ] Tests for edge cases (not found, conflicts)
- [ ] All tests passing
- [ ] Test coverage >= 70%

### Functionality
- [ ] Repository interface defined
- [ ] In-memory implementation complete
- [ ] All CRUD operations working
- [ ] Status transition validation
- [ ] Filtering by multiple criteria
- [ ] Pagination working correctly
- [ ] Sorting by multiple fields
- [ ] Secondary indexes working
- [ ] Statistics method working

### Documentation
- [ ] All methods documented with JSDoc
- [ ] Create /docs/US-006-repository-guide.md with:
  - Repository pattern explanation
  - Usage examples
  - Status transition rules
  - Filtering and pagination guide
  - Future migration path
  - Best practices
- [ ] Update README.md if needed

### Integration
- [ ] Repository factory working
- [ ] Singleton pattern implemented
- [ ] Types properly exported
- [ ] Error handling integrated

---

## Verification Steps

1. **Test CRUD Operations**
   ```bash
   npm test tests/unit/repositories/InMemoryJobRepository.test.ts
   # All CRUD tests should pass
   ```

2. **Test Status Transitions**
   ```bash
   npm test tests/unit/repositories/statusTransitions.test.ts
   # All transition tests should pass
   ```

3. **Test Repository in Isolation**
   ```typescript
   import { InMemoryJobRepository } from './repositories';

   const repo = new InMemoryJobRepository();
   const job = createJob('test');
   await repo.create(job);
   const found = await repo.findById(job.id);
   console.log(found); // Should match created job
   ```

4. **Test Pagination**
   ```typescript
   // Create 25 jobs
   for (let i = 0; i < 25; i++) {
     await repo.create(createJob(\`Job \${i}\`));
   }

   const page1 = await repo.findAll({ page: 1, limit: 10 });
   console.log(page1.totalPages); // Should be 3
   console.log(page1.hasNext); // Should be true
   ```

5. **Run All Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

---

## Notes for Developers
- Repository uses Map for O(1) lookups
- All methods return copies of jobs (immutable)
- Status transitions are validated automatically
- Terminal states (completed, failed, cancelled) cannot transition
- Secondary index maintained for Sora job IDs
- Repository is thread-safe for async operations
- Use factory methods to get repository instance
- In-memory storage will be replaced with database in production

## Related Documentation
- `/docs/US-006-repository-guide.md` (to be created)
- Repository Pattern: https://martinfowler.com/eaaCatalog/repository.html
