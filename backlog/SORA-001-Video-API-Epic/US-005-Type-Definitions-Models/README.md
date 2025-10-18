# User Story: US-005 - Type Definitions & Models

## Story Description
**As a** developer
**I want** comprehensive TypeScript type definitions and data models
**So that** I have type safety throughout the application

## Acceptance Criteria
- [ ] Sora API types defined (SoraRequest, SoraResponse, SoraBatchRequest)
- [ ] Job models created (Job, JobStatus, VideoResult)
- [ ] Request/Response DTOs (VideoRequest, BatchRequest, VideoResponse)
- [ ] Common types (Pagination, ApiResponse)
- [ ] TypeBox schemas for all models
- [ ] Enums for status values and video parameters
- [ ] Type guards for runtime validation

## Story Points
3

## Priority
Must Have (P0)

## Dependencies
- US-001 (Project Foundation)
- US-004 (Swagger Documentation)

## Technical Notes
- Use TypeBox for schema generation and validation
- Define both TypeScript types and runtime schemas
- Include comprehensive JSDoc for all types
- Use strict TypeScript types (no any)
- Create type guards for runtime checking

---

## Task Prompts

### Task 1: Create Job Status Enum and Types
```
Create src/types/job.ts with job-related types:

/**
 * Job and status type definitions
 * Core types for job management and tracking
 */
import { Type, Static } from '@sinclair/typebox';

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
 * Job status schema for validation
 */
export const JobStatusSchema = Type.Enum(JobStatus, {
  description: 'Current status of the job',
  examples: ['pending', 'processing', 'completed'],
});

/**
 * Job priority enum
 */
export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

/**
 * Job metadata interface
 */
export interface JobMetadata {
  createdBy?: string;
  source?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Job metadata schema
 */
export const JobMetadataSchema = Type.Object(
  {
    createdBy: Type.Optional(Type.String({ description: 'User who created the job' })),
    source: Type.Optional(Type.String({ description: 'Source of the job request' })),
    tags: Type.Optional(Type.Array(Type.String(), { description: 'Job tags' })),
  },
  {
    additionalProperties: true,
    description: 'Additional job metadata',
  }
);

/**
 * Job interface
 */
export interface Job {
  id: string;
  status: JobStatus;
  priority: JobPriority;
  prompt: string;
  soraJobId?: string;
  result?: VideoResult;
  error?: JobError;
  metadata?: JobMetadata;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Video result interface
 */
export interface VideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  width: number;
  height: number;
  format: string;
  fileSize?: number;
}

/**
 * Video result schema
 */
export const VideoResultSchema = Type.Object(
  {
    videoUrl: Type.String({ format: 'uri', description: 'URL to the generated video' }),
    thumbnailUrl: Type.Optional(
      Type.String({ format: 'uri', description: 'URL to video thumbnail' })
    ),
    duration: Type.Number({ minimum: 0, description: 'Video duration in seconds' }),
    width: Type.Integer({ minimum: 1, description: 'Video width in pixels' }),
    height: Type.Integer({ minimum: 1, description: 'Video height in pixels' }),
    format: Type.String({ description: 'Video format (e.g., mp4, webm)' }),
    fileSize: Type.Optional(Type.Integer({ minimum: 0, description: 'File size in bytes' })),
  },
  {
    $id: 'VideoResult',
    description: 'Generated video result information',
  }
);

export type VideoResultType = Static<typeof VideoResultSchema>;

/**
 * Job error interface
 */
export interface JobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Job error schema
 */
export const JobErrorSchema = Type.Object(
  {
    code: Type.String({ description: 'Error code' }),
    message: Type.String({ description: 'Error message' }),
    details: Type.Optional(
      Type.Record(Type.String(), Type.Unknown(), { description: 'Additional error details' })
    ),
    timestamp: Type.String({ format: 'date-time', description: 'When the error occurred' }),
  },
  {
    $id: 'JobError',
    description: 'Job error information',
  }
);

export type JobErrorType = Static<typeof JobErrorSchema>;

/**
 * Job schema for API responses
 */
export const JobSchema = Type.Object(
  {
    id: Type.String({ description: 'Unique job identifier' }),
    status: JobStatusSchema,
    priority: Type.Enum(JobPriority, { description: 'Job priority' }),
    prompt: Type.String({ description: 'Video generation prompt' }),
    soraJobId: Type.Optional(Type.String({ description: 'Sora API job identifier' })),
    result: Type.Optional(VideoResultSchema),
    error: Type.Optional(JobErrorSchema),
    metadata: Type.Optional(JobMetadataSchema),
    createdAt: Type.String({ format: 'date-time', description: 'Job creation time' }),
    updatedAt: Type.String({ format: 'date-time', description: 'Last update time' }),
    startedAt: Type.Optional(
      Type.String({ format: 'date-time', description: 'Processing start time' })
    ),
    completedAt: Type.Optional(
      Type.String({ format: 'date-time', description: 'Completion time' })
    ),
  },
  {
    $id: 'Job',
    description: 'Video generation job',
  }
);

export type JobType = Static<typeof JobSchema>;
```

### Task 2: Create Sora API Types
```
Create src/types/sora.ts with Sora API-specific types:

/**
 * OpenAI Sora API type definitions
 * Types for interacting with the Sora video generation API
 */
import { Type, Static } from '@sinclair/typebox';

/**
 * Video resolution options
 */
export enum VideoResolution {
  SD = '480p',
  HD = '720p',
  FULL_HD = '1080p',
  UHD = '2160p',
}

/**
 * Video aspect ratio options
 */
export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '9:16',
  LANDSCAPE = '16:9',
  WIDESCREEN = '21:9',
}

/**
 * Sora request parameters
 */
export interface SoraRequest {
  prompt: string;
  duration?: number;
  resolution?: VideoResolution;
  aspectRatio?: AspectRatio;
  fps?: number;
  seed?: number;
  negativePrompt?: string;
}

/**
 * Sora request schema
 */
export const SoraRequestSchema = Type.Object(
  {
    prompt: Type.String({
      minLength: 1,
      maxLength: 2000,
      description: 'Text prompt describing the video to generate',
      examples: ['A serene sunset over a calm ocean with gentle waves'],
    }),
    duration: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: 60,
        default: 10,
        description: 'Video duration in seconds',
      })
    ),
    resolution: Type.Optional(
      Type.Enum(VideoResolution, {
        default: VideoResolution.HD,
        description: 'Video resolution',
      })
    ),
    aspectRatio: Type.Optional(
      Type.Enum(AspectRatio, {
        default: AspectRatio.LANDSCAPE,
        description: 'Video aspect ratio',
      })
    ),
    fps: Type.Optional(
      Type.Integer({
        minimum: 24,
        maximum: 60,
        default: 30,
        description: 'Frames per second',
      })
    ),
    seed: Type.Optional(
      Type.Integer({
        minimum: 0,
        description: 'Random seed for reproducibility',
      })
    ),
    negativePrompt: Type.Optional(
      Type.String({
        maxLength: 500,
        description: 'Things to avoid in the generated video',
      })
    ),
  },
  {
    $id: 'SoraRequest',
    description: 'Parameters for Sora video generation',
  }
);

export type SoraRequestType = Static<typeof SoraRequestSchema>;

/**
 * Sora API response status
 */
export enum SoraStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Sora API response
 */
export interface SoraResponse {
  id: string;
  status: SoraStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  metadata?: SoraVideoMetadata;
  error?: SoraError;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sora video metadata
 */
export interface SoraVideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
  fileSize?: number;
}

/**
 * Sora video metadata schema
 */
export const SoraVideoMetadataSchema = Type.Object({
  duration: Type.Number({ minimum: 0, description: 'Video duration in seconds' }),
  width: Type.Integer({ minimum: 1, description: 'Video width in pixels' }),
  height: Type.Integer({ minimum: 1, description: 'Video height in pixels' }),
  fps: Type.Integer({ minimum: 1, description: 'Frames per second' }),
  format: Type.String({ description: 'Video format' }),
  fileSize: Type.Optional(Type.Integer({ minimum: 0, description: 'File size in bytes' })),
});

export type SoraVideoMetadataType = Static<typeof SoraVideoMetadataSchema>;

/**
 * Sora API error
 */
export interface SoraError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Sora API error schema
 */
export const SoraErrorSchema = Type.Object({
  code: Type.String({ description: 'Error code from Sora API' }),
  message: Type.String({ description: 'Error message from Sora API' }),
  details: Type.Optional(
    Type.Record(Type.String(), Type.Unknown(), { description: 'Additional error details' })
  ),
});

export type SoraErrorType = Static<typeof SoraErrorSchema>;

/**
 * Sora batch request
 */
export interface SoraBatchRequest {
  requests: SoraRequest[];
  batchId?: string;
}

/**
 * Sora batch request schema
 */
export const SoraBatchRequestSchema = Type.Object({
  requests: Type.Array(SoraRequestSchema, {
    minItems: 1,
    maxItems: 10,
    description: 'Array of video generation requests',
  }),
  batchId: Type.Optional(Type.String({ description: 'Optional batch identifier' })),
});

export type SoraBatchRequestType = Static<typeof SoraBatchRequestSchema>;
```

### Task 3: Create Request/Response DTOs
```
Create src/models/dto/video.dto.ts with API request/response models:

/**
 * Video API Data Transfer Objects (DTOs)
 * Request and response models for video endpoints
 */
import { Type, Static } from '@sinclair/typebox';
import { SoraRequestSchema } from '../../types/sora.js';
import { JobSchema, JobMetadataSchema } from '../../types/job.js';

/**
 * Create video request DTO
 */
export const CreateVideoRequestSchema = Type.Object(
  {
    prompt: Type.String({
      minLength: 1,
      maxLength: 2000,
      description: 'Text description of the video to generate',
      examples: ['A time-lapse of a bustling city street at night'],
    }),
    duration: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: 60,
        default: 10,
        description: 'Video duration in seconds (1-60)',
      })
    ),
    resolution: Type.Optional(
      Type.String({
        enum: ['480p', '720p', '1080p', '2160p'],
        default: '720p',
        description: 'Video resolution',
      })
    ),
    aspectRatio: Type.Optional(
      Type.String({
        enum: ['1:1', '9:16', '16:9', '21:9'],
        default: '16:9',
        description: 'Video aspect ratio',
      })
    ),
    fps: Type.Optional(
      Type.Integer({
        minimum: 24,
        maximum: 60,
        default: 30,
        description: 'Frames per second (24-60)',
      })
    ),
    seed: Type.Optional(
      Type.Integer({
        minimum: 0,
        description: 'Random seed for reproducibility',
      })
    ),
    negativePrompt: Type.Optional(
      Type.String({
        maxLength: 500,
        description: 'Elements to avoid in the video',
      })
    ),
    priority: Type.Optional(
      Type.String({
        enum: ['low', 'normal', 'high'],
        default: 'normal',
        description: 'Job priority',
      })
    ),
    metadata: Type.Optional(JobMetadataSchema),
  },
  {
    $id: 'CreateVideoRequest',
    description: 'Request body for creating a single video',
    examples: [
      {
        prompt: 'A serene sunset over mountains',
        duration: 15,
        resolution: '1080p',
        aspectRatio: '16:9',
      },
    ],
  }
);

export type CreateVideoRequest = Static<typeof CreateVideoRequestSchema>;

/**
 * Create video response DTO
 */
export const CreateVideoResponseSchema = Type.Object(
  {
    success: Type.Boolean({ default: true }),
    data: Type.Object({
      jobId: Type.String({ description: 'Unique job identifier' }),
      status: Type.String({ description: 'Initial job status' }),
      message: Type.String({ description: 'Status message' }),
    }),
    timestamp: Type.String({ format: 'date-time' }),
  },
  {
    $id: 'CreateVideoResponse',
    description: 'Response after creating a video job',
  }
);

export type CreateVideoResponse = Static<typeof CreateVideoResponseSchema>;

/**
 * Batch video request DTO
 */
export const BatchVideoRequestSchema = Type.Object(
  {
    videos: Type.Array(CreateVideoRequestSchema, {
      minItems: 1,
      maxItems: 10,
      description: 'Array of video generation requests',
    }),
    batchName: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 100,
        description: 'Optional name for the batch',
      })
    ),
    metadata: Type.Optional(JobMetadataSchema),
  },
  {
    $id: 'BatchVideoRequest',
    description: 'Request body for batch video generation',
    examples: [
      {
        videos: [
          {
            prompt: 'A sunny beach',
            duration: 10,
          },
          {
            prompt: 'Mountain landscape',
            duration: 15,
          },
        ],
        batchName: 'Nature scenes',
      },
    ],
  }
);

export type BatchVideoRequest = Static<typeof BatchVideoRequestSchema>;

/**
 * Batch video response DTO
 */
export const BatchVideoResponseSchema = Type.Object(
  {
    success: Type.Boolean({ default: true }),
    data: Type.Object({
      batchId: Type.String({ description: 'Batch identifier' }),
      jobIds: Type.Array(Type.String(), { description: 'Array of created job IDs' }),
      total: Type.Integer({ description: 'Total number of jobs created' }),
      message: Type.String({ description: 'Status message' }),
    }),
    timestamp: Type.String({ format: 'date-time' }),
  },
  {
    $id: 'BatchVideoResponse',
    description: 'Response after creating a batch of video jobs',
  }
);

export type BatchVideoResponse = Static<typeof BatchVideoResponseSchema>;

/**
 * Job status response DTO
 */
export const JobStatusResponseSchema = Type.Object(
  {
    success: Type.Boolean({ default: true }),
    data: JobSchema,
    timestamp: Type.String({ format: 'date-time' }),
  },
  {
    $id: 'JobStatusResponse',
    description: 'Response containing job status',
  }
);

export type JobStatusResponse = Static<typeof JobStatusResponseSchema>;

/**
 * Job list query parameters
 */
export const JobListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(
    Type.String({
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      description: 'Filter by job status',
    })
  ),
  sortBy: Type.Optional(
    Type.String({
      enum: ['createdAt', 'updatedAt', 'priority'],
      default: 'createdAt',
      description: 'Sort field',
    })
  ),
  order: Type.Optional(
    Type.String({
      enum: ['asc', 'desc'],
      default: 'desc',
      description: 'Sort order',
    })
  ),
});

export type JobListQuery = Static<typeof JobListQuerySchema>;
```

### Task 4: Create Type Guards
```
Create src/types/guards.ts with runtime type checking utilities:

/**
 * Type guard utilities
 * Runtime type checking functions
 */
import { Job, JobStatus, JobError, VideoResult } from './job.js';
import { SoraResponse, SoraStatus } from './sora.js';

/**
 * Check if value is a valid JobStatus
 */
export function isJobStatus(value: unknown): value is JobStatus {
  return (
    typeof value === 'string' &&
    Object.values(JobStatus).includes(value as JobStatus)
  );
}

/**
 * Check if value is a valid Job
 */
export function isJob(value: unknown): value is Job {
  if (typeof value !== 'object' || value === null) return false;

  const job = value as Job;
  return (
    typeof job.id === 'string' &&
    isJobStatus(job.status) &&
    typeof job.prompt === 'string' &&
    job.createdAt instanceof Date &&
    job.updatedAt instanceof Date
  );
}

/**
 * Check if value is a VideoResult
 */
export function isVideoResult(value: unknown): value is VideoResult {
  if (typeof value !== 'object' || value === null) return false;

  const result = value as VideoResult;
  return (
    typeof result.videoUrl === 'string' &&
    typeof result.duration === 'number' &&
    typeof result.width === 'number' &&
    typeof result.height === 'number' &&
    typeof result.format === 'string'
  );
}

/**
 * Check if value is a JobError
 */
export function isJobError(value: unknown): value is JobError {
  if (typeof value !== 'object' || value === null) return false;

  const error = value as JobError;
  return (
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    error.timestamp instanceof Date
  );
}

/**
 * Check if value is a valid SoraStatus
 */
export function isSoraStatus(value: unknown): value is SoraStatus {
  return (
    typeof value === 'string' &&
    Object.values(SoraStatus).includes(value as SoraStatus)
  );
}

/**
 * Check if value is a SoraResponse
 */
export function isSoraResponse(value: unknown): value is SoraResponse {
  if (typeof value !== 'object' || value === null) return false;

  const response = value as SoraResponse;
  return (
    typeof response.id === 'string' &&
    isSoraStatus(response.status) &&
    typeof response.createdAt === 'string' &&
    typeof response.updatedAt === 'string'
  );
}

/**
 * Check if job is in a terminal state
 */
export function isJobTerminal(status: JobStatus): boolean {
  return [
    JobStatus.COMPLETED,
    JobStatus.FAILED,
    JobStatus.CANCELLED,
  ].includes(status);
}

/**
 * Check if job is in progress
 */
export function isJobInProgress(status: JobStatus): boolean {
  return [JobStatus.PENDING, JobStatus.PROCESSING].includes(status);
}

/**
 * Check if Sora job is in terminal state
 */
export function isSoraTerminal(status: SoraStatus): boolean {
  return [
    SoraStatus.SUCCEEDED,
    SoraStatus.FAILED,
    SoraStatus.CANCELLED,
  ].includes(status);
}
```

### Task 5: Create Model Factory Functions
```
Create src/models/factories/job.factory.ts:

/**
 * Job factory functions
 * Helper functions for creating job instances
 */
import { Job, JobStatus, JobPriority, JobMetadata } from '../../types/job.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new job instance
 */
export function createJob(
  prompt: string,
  priority: JobPriority = JobPriority.NORMAL,
  metadata?: JobMetadata
): Job {
  const now = new Date();

  return {
    id: uuidv4(),
    status: JobStatus.PENDING,
    priority,
    prompt,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update job status
 */
export function updateJobStatus(job: Job, status: JobStatus): Job {
  const now = new Date();
  const updates: Partial<Job> = {
    status,
    updatedAt: now,
  };

  // Set startedAt when processing begins
  if (status === JobStatus.PROCESSING && !job.startedAt) {
    updates.startedAt = now;
  }

  // Set completedAt when job finishes
  if (
    [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(status) &&
    !job.completedAt
  ) {
    updates.completedAt = now;
  }

  return {
    ...job,
    ...updates,
  };
}

/**
 * Convert Job to plain object for serialization
 */
export function serializeJob(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    status: job.status,
    priority: job.priority,
    prompt: job.prompt,
    soraJobId: job.soraJobId,
    result: job.result,
    error: job.error
      ? {
          ...job.error,
          timestamp: job.error.timestamp.toISOString(),
        }
      : undefined,
    metadata: job.metadata,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
  };
}

/**
 * Deserialize job from plain object
 */
export function deserializeJob(data: Record<string, unknown>): Job {
  return {
    id: data.id as string,
    status: data.status as JobStatus,
    priority: data.priority as JobPriority,
    prompt: data.prompt as string,
    soraJobId: data.soraJobId as string | undefined,
    result: data.result as any,
    error: data.error
      ? {
          ...(data.error as any),
          timestamp: new Date((data.error as any).timestamp),
        }
      : undefined,
    metadata: data.metadata as JobMetadata | undefined,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
    startedAt: data.startedAt ? new Date(data.startedAt as string) : undefined,
    completedAt: data.completedAt ? new Date(data.completedAt as string) : undefined,
  };
}

// Note: uuid package needs to be installed
// npm install uuid
// npm install --save-dev @types/uuid
```

### Task 6: Create Index Files for Exports
```
Create src/types/index.ts to export all types:

/**
 * Type definitions exports
 * Central export point for all application types
 */
export * from './job.js';
export * from './sora.js';
export * from './guards.js';

Create src/models/index.ts:

/**
 * Models exports
 * Central export point for all data models
 */
export * from './dto/video.dto.js';
export * from './factories/job.factory.js';
```

### Task 7: Install UUID Package
```
Install uuid package for ID generation:

npm install uuid
npm install --save-dev @types/uuid

Verify installation by checking package.json
```

### Task 8: Create Type Tests
```
Create tests/unit/types/guards.test.ts:

/**
 * Tests for type guard functions
 */
import { describe, it, expect } from '@jest/globals';
import {
  isJobStatus,
  isJob,
  isVideoResult,
  isJobError,
  isJobTerminal,
  isJobInProgress,
} from '../../../src/types/guards';
import { JobStatus } from '../../../src/types/job';

describe('Type Guards', () => {
  describe('isJobStatus', () => {
    it('should return true for valid JobStatus', () => {
      expect(isJobStatus('pending')).toBe(true);
      expect(isJobStatus('processing')).toBe(true);
      expect(isJobStatus('completed')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isJobStatus('invalid')).toBe(false);
      expect(isJobStatus(123)).toBe(false);
      expect(isJobStatus(null)).toBe(false);
    });
  });

  describe('isJob', () => {
    it('should return true for valid Job object', () => {
      const validJob = {
        id: 'test-id',
        status: JobStatus.PENDING,
        priority: 'normal',
        prompt: 'test prompt',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isJob(validJob)).toBe(true);
    });

    it('should return false for invalid Job object', () => {
      expect(isJob({})).toBe(false);
      expect(isJob(null)).toBe(false);
      expect(isJob('not a job')).toBe(false);
    });
  });

  describe('isVideoResult', () => {
    it('should return true for valid VideoResult', () => {
      const validResult = {
        videoUrl: 'https://example.com/video.mp4',
        duration: 10,
        width: 1920,
        height: 1080,
        format: 'mp4',
      };

      expect(isVideoResult(validResult)).toBe(true);
    });

    it('should return false for invalid VideoResult', () => {
      expect(isVideoResult({})).toBe(false);
      expect(isVideoResult({ videoUrl: 'test' })).toBe(false);
    });
  });

  describe('isJobTerminal', () => {
    it('should return true for terminal statuses', () => {
      expect(isJobTerminal(JobStatus.COMPLETED)).toBe(true);
      expect(isJobTerminal(JobStatus.FAILED)).toBe(true);
      expect(isJobTerminal(JobStatus.CANCELLED)).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isJobTerminal(JobStatus.PENDING)).toBe(false);
      expect(isJobTerminal(JobStatus.PROCESSING)).toBe(false);
    });
  });

  describe('isJobInProgress', () => {
    it('should return true for in-progress statuses', () => {
      expect(isJobInProgress(JobStatus.PENDING)).toBe(true);
      expect(isJobInProgress(JobStatus.PROCESSING)).toBe(true);
    });

    it('should return false for terminal statuses', () => {
      expect(isJobInProgress(JobStatus.COMPLETED)).toBe(false);
      expect(isJobInProgress(JobStatus.FAILED)).toBe(false);
    });
  });
});
```

### Task 9: Create Factory Tests
```
Create tests/unit/models/job.factory.test.ts:

/**
 * Tests for job factory functions
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createJob,
  updateJobStatus,
  serializeJob,
  deserializeJob,
} from '../../../src/models/factories/job.factory';
import { JobStatus, JobPriority } from '../../../src/types/job';

describe('Job Factory', () => {
  describe('createJob', () => {
    it('should create a new job with default values', () => {
      const job = createJob('test prompt');

      expect(job.id).toBeDefined();
      expect(job.prompt).toBe('test prompt');
      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.priority).toBe(JobPriority.NORMAL);
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a job with custom priority', () => {
      const job = createJob('test prompt', JobPriority.HIGH);

      expect(job.priority).toBe(JobPriority.HIGH);
    });

    it('should create a job with metadata', () => {
      const metadata = { createdBy: 'user123' };
      const job = createJob('test prompt', JobPriority.NORMAL, metadata);

      expect(job.metadata).toEqual(metadata);
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status and updatedAt', () => {
      const job = createJob('test prompt');
      const updated = updateJobStatus(job, JobStatus.PROCESSING);

      expect(updated.status).toBe(JobStatus.PROCESSING);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(job.updatedAt.getTime());
    });

    it('should set startedAt when status changes to PROCESSING', () => {
      const job = createJob('test prompt');
      const updated = updateJobStatus(job, JobStatus.PROCESSING);

      expect(updated.startedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when status changes to terminal state', () => {
      const job = createJob('test prompt');
      const updated = updateJobStatus(job, JobStatus.COMPLETED);

      expect(updated.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('serializeJob and deserializeJob', () => {
    it('should serialize and deserialize job correctly', () => {
      const original = createJob('test prompt');
      const serialized = serializeJob(original);
      const deserialized = deserializeJob(serialized);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.status).toBe(original.status);
      expect(deserialized.prompt).toBe(original.prompt);
      expect(deserialized.createdAt.getTime()).toBe(original.createdAt.getTime());
    });
  });
});
```

### Task 10: Create Schema Validation Tests
```
Create tests/unit/models/dto.test.ts:

/**
 * Tests for DTO schemas
 */
import { describe, it, expect } from '@jest/globals';
import { Value } from '@sinclair/typebox/value';
import {
  CreateVideoRequestSchema,
  BatchVideoRequestSchema,
  JobListQuerySchema,
} from '../../../src/models/dto/video.dto';

describe('DTO Schemas', () => {
  describe('CreateVideoRequestSchema', () => {
    it('should validate valid request', () => {
      const valid = {
        prompt: 'A beautiful sunset',
        duration: 10,
        resolution: '1080p',
      };

      expect(Value.Check(CreateVideoRequestSchema, valid)).toBe(true);
    });

    it('should require prompt', () => {
      const invalid = {
        duration: 10,
      };

      expect(Value.Check(CreateVideoRequestSchema, invalid)).toBe(false);
    });

    it('should reject prompt that is too long', () => {
      const invalid = {
        prompt: 'x'.repeat(2001),
      };

      expect(Value.Check(CreateVideoRequestSchema, invalid)).toBe(false);
    });
  });

  describe('BatchVideoRequestSchema', () => {
    it('should validate valid batch request', () => {
      const valid = {
        videos: [
          { prompt: 'Video 1' },
          { prompt: 'Video 2' },
        ],
        batchName: 'Test batch',
      };

      expect(Value.Check(BatchVideoRequestSchema, valid)).toBe(true);
    });

    it('should reject empty videos array', () => {
      const invalid = {
        videos: [],
      };

      expect(Value.Check(BatchVideoRequestSchema, invalid)).toBe(false);
    });

    it('should reject more than 10 videos', () => {
      const invalid = {
        videos: Array(11).fill({ prompt: 'Test' }),
      };

      expect(Value.Check(BatchVideoRequestSchema, invalid)).toBe(false);
    });
  });

  describe('JobListQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const valid = {
        page: 1,
        limit: 20,
        status: 'completed',
        sortBy: 'createdAt',
        order: 'desc',
      };

      expect(Value.Check(JobListQuerySchema, valid)).toBe(true);
    });

    it('should accept empty query', () => {
      expect(Value.Check(JobListQuerySchema, {})).toBe(true);
    });
  });
});
```

### Task 11: Add JSDoc Comments
```
Ensure all types, interfaces, enums, and factory functions have comprehensive JSDoc:
- Document all properties and parameters
- Include usage examples
- Document enum values
- Add @example tags for complex types
```

### Task 12: Run Linting and Formatting
```
Run quality checks:

npm run lint:fix
npm run format
npm run type-check

Verify no errors:
npm run lint
npm run format:check
```

### Task 13: Create Documentation
```
Create /docs/US-005-types-models-guide.md:

# Type Definitions & Models Guide

## Overview
Comprehensive guide to TypeScript types, models, and DTOs in the Sora Video API.

## Core Types

### Job Types

#### JobStatus Enum
- PENDING: Job created, waiting to be processed
- PROCESSING: Job is being processed by Sora
- COMPLETED: Job completed successfully
- FAILED: Job failed with an error
- CANCELLED: Job was cancelled

#### Job Interface
\`\`\`typescript
interface Job {
  id: string;
  status: JobStatus;
  priority: JobPriority;
  prompt: string;
  soraJobId?: string;
  result?: VideoResult;
  error?: JobError;
  metadata?: JobMetadata;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
\`\`\`

### Sora API Types

#### Video Parameters
- Resolution: 480p, 720p, 1080p, 2160p
- Aspect Ratio: 1:1, 9:16, 16:9, 21:9
- FPS: 24-60
- Duration: 1-60 seconds

#### SoraRequest Interface
\`\`\`typescript
interface SoraRequest {
  prompt: string;
  duration?: number;
  resolution?: VideoResolution;
  aspectRatio?: AspectRatio;
  fps?: number;
  seed?: number;
  negativePrompt?: string;
}
\`\`\`

## DTOs (Data Transfer Objects)

### CreateVideoRequest
Request body for creating a single video:
\`\`\`typescript
{
  prompt: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  fps?: number;
  seed?: number;
  negativePrompt?: string;
  priority?: string;
  metadata?: JobMetadata;
}
\`\`\`

### BatchVideoRequest
Request body for batch video creation:
\`\`\`typescript
{
  videos: CreateVideoRequest[];
  batchName?: string;
  metadata?: JobMetadata;
}
\`\`\`

## Type Guards

Type guards provide runtime type checking:
\`\`\`typescript
import { isJobStatus, isJob, isJobTerminal } from './types/guards';

// Check if value is a valid JobStatus
if (isJobStatus(value)) {
  // TypeScript knows value is JobStatus
}

// Check if job is in terminal state
if (isJobTerminal(job.status)) {
  // Job is completed, failed, or cancelled
}
\`\`\`

## Factory Functions

### Creating Jobs
\`\`\`typescript
import { createJob } from './models/factories/job.factory';
import { JobPriority } from './types/job';

const job = createJob(
  'A beautiful sunset',
  JobPriority.HIGH,
  { createdBy: 'user123' }
);
\`\`\`

### Updating Job Status
\`\`\`typescript
import { updateJobStatus } from './models/factories/job.factory';
import { JobStatus } from './types/job';

const updated = updateJobStatus(job, JobStatus.COMPLETED);
\`\`\`

### Serialization
\`\`\`typescript
import { serializeJob, deserializeJob } from './models/factories/job.factory';

// For API responses
const serialized = serializeJob(job);

// From storage
const job = deserializeJob(data);
\`\`\`

## Schema Validation

Using TypeBox for runtime validation:
\`\`\`typescript
import { Value } from '@sinclair/typebox/value';
import { CreateVideoRequestSchema } from './models/dto/video.dto';

const isValid = Value.Check(CreateVideoRequestSchema, data);
if (!isValid) {
  const errors = [...Value.Errors(CreateVideoRequestSchema, data)];
  // Handle validation errors
}
\`\`\`

## Best Practices

1. **Always use type guards** for runtime validation
2. **Use factory functions** for creating instances
3. **Leverage TypeBox schemas** for API validation
4. **Serialize/deserialize** when crossing boundaries
5. **Check terminal states** before operations
6. **Use enums** instead of string literals

## Common Patterns

### Checking Job Completion
\`\`\`typescript
import { isJobTerminal } from './types/guards';

if (isJobTerminal(job.status)) {
  // Job has finished (success or failure)
  if (job.status === JobStatus.COMPLETED) {
    // Handle success
  } else {
    // Handle failure or cancellation
  }
}
\`\`\`

### Creating a Batch
\`\`\`typescript
const batchRequest: BatchVideoRequest = {
  videos: [
    { prompt: 'Video 1', duration: 10 },
    { prompt: 'Video 2', duration: 15 },
  ],
  batchName: 'My Batch',
  metadata: { createdBy: 'user123' },
};
\`\`\`
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors
- [ ] All types and interfaces have JSDoc
- [ ] No use of `any` type

### Testing
- [ ] Unit tests for type guards
- [ ] Unit tests for factory functions
- [ ] Schema validation tests
- [ ] DTO validation tests
- [ ] All tests passing
- [ ] Test coverage >= 70%

### Functionality
- [ ] All enums defined and working
- [ ] Type guards validate correctly
- [ ] Factory functions create valid instances
- [ ] Serialization/deserialization works
- [ ] TypeBox schemas validate correctly
- [ ] All DTOs properly typed
- [ ] UUID generation works

### Documentation
- [ ] All types documented with JSDoc
- [ ] Create /docs/US-005-types-models-guide.md with:
  - Type reference
  - DTO documentation
  - Type guard examples
  - Factory function usage
  - Schema validation examples
  - Best practices
- [ ] Update README.md if needed

### Integration
- [ ] Types exported from index files
- [ ] Schemas integrate with Swagger
- [ ] UUID package installed
- [ ] Type definitions available throughout app

---

## Verification Steps

1. **Test Type Compilation**
   ```bash
   npm run type-check
   # Should compile without errors
   ```

2. **Test Type Guards**
   ```bash
   npm test tests/unit/types/guards.test.ts
   # All type guard tests should pass
   ```

3. **Test Factory Functions**
   ```bash
   npm test tests/unit/models/job.factory.test.ts
   # All factory tests should pass
   ```

4. **Test Schema Validation**
   ```bash
   npm test tests/unit/models/dto.test.ts
   # All DTO validation tests should pass
   ```

5. **Verify UUID Generation**
   ```typescript
   import { createJob } from './models/factories/job.factory';
   const job = createJob('test');
   console.log(job.id); // Should be a valid UUID
   ```

6. **Run All Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

---

## Notes for Developers
- Always use TypeBox schemas for API validation
- Use type guards when checking runtime values
- Factory functions ensure consistent object creation
- Serialize jobs when storing or returning from API
- Enums provide type safety for status values
- UUID v4 used for all job IDs
- Dates are stored as Date objects internally
- DTOs use ISO date strings for API communication

## Related Documentation
- `/docs/US-005-types-models-guide.md` (to be created)
- TypeBox: https://github.com/sinclairzx81/typebox
- TypeScript Handbook: https://www.typescriptlang.org/docs/
