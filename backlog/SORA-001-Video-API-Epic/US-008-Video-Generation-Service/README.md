# User Story: US-008 - Video Generation Service

## Story Description
**As a** developer
**I want** a video generation service with business logic
**So that** I can orchestrate video creation workflows

## Acceptance Criteria
- [ ] createVideo method implemented
- [ ] getVideoStatus method implemented
- [ ] getVideoResult method implemented
- [ ] cancelVideo method implemented
- [ ] Integration with job repository
- [ ] Integration with Sora client
- [ ] Job status synchronization
- [ ] Business validation logic
- [ ] Error handling and recovery

## Story Points
5

## Priority
Must Have (P0)

## Dependencies
- US-005 (Type Definitions & Models)
- US-006 (Job Repository)
- US-007 (Sora API Client)

## Technical Notes
- Service layer contains business logic
- Orchestrates repository and client operations
- Handles job lifecycle management
- Validates business rules
- Manages status transitions

---

## Task Prompts

### Task 1: Create Video Service Interface
```
Create src/services/interfaces/IVideoService.ts:

/**
 * Video service interface
 * Defines business logic contract for video generation
 */
import { Job, JobStatus } from '../../types/job.js';
import { SoraRequest } from '../../types/sora.js';
import { CreateVideoRequest, BatchVideoRequest } from '../../models/dto/video.dto.js';

export interface IVideoService {
  /**
   * Create a new video generation job
   */
  createVideo(request: CreateVideoRequest): Promise<Job>;

  /**
   * Get job status and details
   */
  getJobStatus(jobId: string): Promise<Job>;

  /**
   * Get video result if completed
   */
  getVideoResult(jobId: string): Promise<Job>;

  /**
   * Cancel an in-progress job
   */
  cancelJob(jobId: string): Promise<Job>;

  /**
   * Sync job status with Sora API
   */
  syncJobStatus(jobId: string): Promise<Job>;
}
```

### Task 2: Create Video Service Implementation
```
Create src/services/VideoService.ts:

/**
 * Video generation service
 * Orchestrates video generation workflow
 */
import { IVideoService } from './interfaces/IVideoService.js';
import { getJobRepository } from '../repositories/index.js';
import { getSoraClient } from '../clients/sora/index.js';
import { createJob, updateJobStatus, serializeJob } from '../models/factories/job.factory.js';
import { Job, JobStatus, JobPriority } from '../types/job.js';
import { SoraRequest, SoraStatus } from '../types/sora.js';
import { CreateVideoRequest } from '../models/dto/video.dto.js';
import { createLogger } from '../utils/logger.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../middleware/errors/index.js';

export class VideoService implements IVideoService {
  private repository = getJobRepository();
  private soraClient = getSoraClient();
  private logger = createLogger('VideoService');

  /**
   * Create a new video generation job
   */
  async createVideo(request: CreateVideoRequest): Promise<Job> {
    this.logger.info({ prompt: request.prompt }, 'Creating video generation job');

    // Validate request
    this.validateVideoRequest(request);

    // Create job in pending state
    const priority = this.parsePriority(request.priority);
    const job = createJob(request.prompt, priority, request.metadata);

    // Save job to repository
    await this.repository.create(job);
    this.logger.debug({ jobId: job.id }, 'Job created in repository');

    // Submit to Sora API asynchronously
    this.submitToSoraAsync(job.id, request).catch((error) => {
      this.logger.error({ error, jobId: job.id }, 'Failed to submit job to Sora');
    });

    return job;
  }

  /**
   * Get job status and details
   */
  async getJobStatus(jobId: string): Promise<Job> {
    this.logger.debug({ jobId }, 'Fetching job status');

    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job', jobId);
    }

    // If job is in progress, sync with Sora
    if (this.isJobInProgress(job)) {
      return this.syncJobStatus(jobId);
    }

    return job;
  }

  /**
   * Get video result if completed
   */
  async getVideoResult(jobId: string): Promise<Job> {
    this.logger.debug({ jobId }, 'Fetching video result');

    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job', jobId);
    }

    // If job not completed, sync status first
    if (job.status !== JobStatus.COMPLETED) {
      const synced = await this.syncJobStatus(jobId);
      if (synced.status !== JobStatus.COMPLETED) {
        throw new BadRequestError('Job is not completed yet', {
          status: synced.status,
        });
      }
      return synced;
    }

    if (!job.result) {
      throw new BadRequestError('Job completed but result not available');
    }

    return job;
  }

  /**
   * Cancel an in-progress job
   */
  async cancelJob(jobId: string): Promise<Job> {
    this.logger.info({ jobId }, 'Cancelling job');

    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job', jobId);
    }

    // Check if job can be cancelled
    if (!this.isJobInProgress(job)) {
      throw new ConflictError('Job cannot be cancelled', {
        status: job.status,
        reason: 'Job is not in progress',
      });
    }

    // Cancel in Sora if soraJobId exists
    if (job.soraJobId) {
      try {
        await this.soraClient.cancelVideo(job.soraJobId);
      } catch (error) {
        this.logger.warn({ error, jobId, soraJobId: job.soraJobId }, 'Failed to cancel in Sora');
      }
    }

    // Update job status to cancelled
    const cancelled = updateJobStatus(job, JobStatus.CANCELLED);
    await this.repository.update(jobId, cancelled);

    this.logger.info({ jobId }, 'Job cancelled successfully');
    return cancelled;
  }

  /**
   * Sync job status with Sora API
   */
  async syncJobStatus(jobId: string): Promise<Job> {
    this.logger.debug({ jobId }, 'Syncing job status with Sora');

    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job', jobId);
    }

    // If no soraJobId, nothing to sync
    if (!job.soraJobId) {
      return job;
    }

    // Fetch status from Sora
    const soraResponse = await this.soraClient.getVideoStatus(job.soraJobId);

    // Map Sora status to job status
    const newStatus = this.mapSoraStatusToJobStatus(soraResponse.status);

    // Update job if status changed
    if (newStatus !== job.status) {
      const updates: Partial<Job> = {
        status: newStatus,
      };

      // Add result if succeeded
      if (soraResponse.status === SoraStatus.SUCCEEDED && soraResponse.videoUrl) {
        updates.result = {
          videoUrl: soraResponse.videoUrl,
          thumbnailUrl: soraResponse.thumbnailUrl,
          duration: soraResponse.metadata?.duration || 0,
          width: soraResponse.metadata?.width || 0,
          height: soraResponse.metadata?.height || 0,
          format: soraResponse.metadata?.format || 'mp4',
          fileSize: soraResponse.metadata?.fileSize,
        };
      }

      // Add error if failed
      if (soraResponse.status === SoraStatus.FAILED && soraResponse.error) {
        updates.error = {
          code: soraResponse.error.code,
          message: soraResponse.error.message,
          details: soraResponse.error.details,
          timestamp: new Date(),
        };
      }

      const updated = await this.repository.update(jobId, updates);
      this.logger.info({ jobId, oldStatus: job.status, newStatus }, 'Job status synced');
      return updated!;
    }

    return job;
  }

  /**
   * Submit job to Sora API (async background operation)
   */
  private async submitToSoraAsync(jobId: string, request: CreateVideoRequest): Promise<void> {
    try {
      // Prepare Sora request
      const soraRequest: SoraRequest = {
        prompt: request.prompt,
        duration: request.duration,
        resolution: request.resolution as any,
        aspectRatio: request.aspectRatio as any,
        fps: request.fps,
        seed: request.seed,
        negativePrompt: request.negativePrompt,
      };

      // Submit to Sora
      const soraResponse = await this.soraClient.createVideo(soraRequest);

      // Update job with Sora job ID and processing status
      await this.repository.update(jobId, {
        soraJobId: soraResponse.id,
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
      });

      this.logger.info(
        { jobId, soraJobId: soraResponse.id },
        'Job submitted to Sora successfully'
      );
    } catch (error) {
      this.logger.error({ error, jobId }, 'Failed to submit job to Sora');

      // Update job to failed status
      await this.repository.update(jobId, {
        status: JobStatus.FAILED,
        error: {
          code: 'SORA_SUBMISSION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Validate video request
   */
  private validateVideoRequest(request: CreateVideoRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new BadRequestError('Prompt is required');
    }

    if (request.prompt.length > 2000) {
      throw new BadRequestError('Prompt must be at most 2000 characters');
    }

    if (request.duration && (request.duration < 1 || request.duration > 60)) {
      throw new BadRequestError('Duration must be between 1 and 60 seconds');
    }

    if (request.fps && (request.fps < 24 || request.fps > 60)) {
      throw new BadRequestError('FPS must be between 24 and 60');
    }
  }

  /**
   * Parse priority string to enum
   */
  private parsePriority(priority?: string): JobPriority {
    if (!priority) return JobPriority.NORMAL;

    switch (priority.toLowerCase()) {
      case 'high':
        return JobPriority.HIGH;
      case 'low':
        return JobPriority.LOW;
      default:
        return JobPriority.NORMAL;
    }
  }

  /**
   * Check if job is in progress
   */
  private isJobInProgress(job: Job): boolean {
    return [JobStatus.PENDING, JobStatus.PROCESSING].includes(job.status);
  }

  /**
   * Map Sora status to job status
   */
  private mapSoraStatusToJobStatus(soraStatus: SoraStatus): JobStatus {
    switch (soraStatus) {
      case SoraStatus.QUEUED:
        return JobStatus.PENDING;
      case SoraStatus.PROCESSING:
        return JobStatus.PROCESSING;
      case SoraStatus.SUCCEEDED:
        return JobStatus.COMPLETED;
      case SoraStatus.FAILED:
        return JobStatus.FAILED;
      case SoraStatus.CANCELLED:
        return JobStatus.CANCELLED;
      default:
        return JobStatus.PENDING;
    }
  }
}

/**
 * Singleton instance
 */
let videoServiceInstance: IVideoService | null = null;

export function getVideoService(): IVideoService {
  if (!videoServiceInstance) {
    videoServiceInstance = new VideoService();
  }
  return videoServiceInstance;
}

export function resetVideoService(): void {
  videoServiceInstance = null;
}
```

### Task 3-15: Additional Implementation Tasks
```
Task 3: Create Service Tests
- tests/unit/services/VideoService.test.ts
- Mock repository and client
- Test all service methods
- Test validation logic
- Test error scenarios

Task 4: Create Integration Tests
- tests/integration/services/VideoService.integration.test.ts
- Use real repository (in-memory)
- Use mock Sora client
- Test full workflows

Task 5: Create Service Factory
- src/services/index.ts
- Export factory functions
- Export interfaces

Task 6: Add Status Polling
- Implement background status polling
- Use setInterval for periodic checks
- Update job statuses automatically

Task 7: Add Metrics Collection
- Track service metrics
- Count operations
- Track success/failure rates

Task 8: Create Validation Tests
- Test all validation rules
- Test boundary conditions
- Test invalid inputs

Task 9: Add JSDoc Comments
- Document all methods
- Include usage examples
- Document business rules

Task 10: Create Workflow Tests
- Test complete job lifecycle
- Test status transitions
- Test error recovery

Task 11: Add Logging
- Log all operations
- Log business decisions
- Log errors with context

Task 12: Create Service Documentation
- /docs/US-008-video-service-guide.md
- Document workflows
- Document business rules
- Usage examples

Task 13: Run Quality Checks
npm run lint:fix && npm run format && npm run type-check

Task 14: Test End-to-End Flow
- Create video
- Check status
- Sync with Sora
- Get result

Task 15: Performance Testing
- Test concurrent operations
- Test large numbers of jobs
- Test error recovery
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors
- [ ] All methods have JSDoc
- [ ] Business logic well-organized

### Testing
- [ ] Unit tests for all service methods
- [ ] Tests for validation logic
- [ ] Tests for status mapping
- [ ] Integration tests with repository
- [ ] All tests passing
- [ ] Test coverage >= 70%

### Functionality
- [ ] createVideo working
- [ ] getJobStatus working
- [ ] getVideoResult working
- [ ] cancelJob working
- [ ] syncJobStatus working
- [ ] Validation working
- [ ] Status mapping correct
- [ ] Async submission working
- [ ] Error handling working

### Documentation
- [ ] All methods documented
- [ ] Create /docs/US-008-video-service-guide.md
- [ ] Document workflows
- [ ] Document business rules
- [ ] Usage examples

### Integration
- [ ] Service factory working
- [ ] Integration with repository
- [ ] Integration with Sora client
- [ ] Error handling integrated
- [ ] Logging integrated

---

## Verification Steps

1. **Test Service Creation**
   ```typescript
   const service = getVideoService();
   const job = await service.createVideo({
     prompt: 'A beautiful sunset',
     duration: 10,
   });
   console.log(job.id); // Should have job ID
   ```

2. **Test Status Sync**
   ```typescript
   const synced = await service.syncJobStatus(jobId);
   console.log(synced.status); // Should show updated status
   ```

3. **Test Complete Workflow**
   ```bash
   npm test tests/integration/services/VideoService.integration.test.ts
   ```

4. **Run All Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

---

## Notes for Developers
- Service contains business logic only
- Repository handles data persistence
- Client handles API communication
- Async submission prevents blocking
- Status sync can be called manually or automatically
- Validation happens in service layer
- Always check job exists before operations

## Related Documentation
- `/docs/US-008-video-service-guide.md` (to be created)
