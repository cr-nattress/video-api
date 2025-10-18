# User Story: US-009 - Batch Processing Service

> **Note**: This is a comprehensive user story outline. Full implementation details are available in `../REMAINING-USER-STORIES.md`

## Story Description
**As a** developer
**I want** a batch processing service for handling multiple video requests
**So that** users can efficiently generate multiple videos in one operation

## Acceptance Criteria
- [ ] createBatch method implemented
- [ ] processBatch method with parallel processing
- [ ] getBatchStatus method
- [ ] Handle partial failures gracefully
- [ ] Progress tracking for batches
- [ ] Batch cancellation support
- [ ] Batch metadata management

## Story Points
5

## Priority
Must Have (P0)

## Dependencies
- US-006 (Job Repository)
- US-007 (Sora API Client)
- US-008 (Video Generation Service)

## Technical Notes
- Process videos in parallel with configurable concurrency
- Handle partial batch failures gracefully
- Track progress for each batch
- Support batch-level metadata
- Allow batch cancellation

---

## Quick Reference

For complete implementation details including:
- All 15 detailed task prompts with code examples
- Complete Definition of Done checklist
- Verification steps
- Testing requirements
- Documentation requirements

**See**: [../REMAINING-USER-STORIES.md](../REMAINING-USER-STORIES.md#us-009-batch-processing-service)

---

## Core Implementation Files

```
src/services/BatchService.ts           # Main batch service implementation
src/services/interfaces/IBatchService.ts # Service interface
src/models/dto/batch.dto.ts            # Batch DTOs
src/types/batch.ts                     # Batch types
src/repositories/BatchRepository.ts    # Batch persistence
tests/unit/services/BatchService.test.ts
tests/integration/services/BatchService.integration.test.ts
```

## Key Methods

### 1. createBatch
```typescript
async createBatch(request: BatchVideoRequest): Promise<BatchResult>
```
- Validates batch request (1-10 videos)
- Creates individual jobs for each video
- Returns batch ID and array of job IDs
- Stores batch metadata

### 2. processBatch
```typescript
async processBatch(batchId: string, concurrency: number = 3): Promise<void>
```
- Processes videos in parallel
- Configurable concurrency limit
- Handles individual job failures
- Updates batch progress
- Completes when all jobs finish (success or failure)

### 3. getBatchStatus
```typescript
async getBatchStatus(batchId: string): Promise<BatchStatus>
```
- Returns overall batch status
- Includes individual job statuses
- Calculates progress percentage
- Shows completed/failed/pending counts

### 4. cancelBatch
```typescript
async cancelBatch(batchId: string): Promise<void>
```
- Cancels all in-progress jobs in the batch
- Updates batch status to cancelled
- Returns cancellation summary

## Batch Data Model

```typescript
interface Batch {
  id: string;
  name?: string;
  jobIds: string[];
  status: BatchStatus; // 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    percentage: number;
  };
  metadata?: JobMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIAL = 'partial',  // Some succeeded, some failed
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
```

## Parallel Processing Strategy

```typescript
// Process jobs with concurrency limit
async function processWithConcurrency(
  jobs: Job[],
  concurrency: number,
  processor: (job: Job) => Promise<void>
): Promise<void> {
  const executing: Promise<void>[] = [];

  for (const job of jobs) {
    const promise = processor(job).then(() => {
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}
```

## Error Handling

### Partial Failure Handling
- Continue processing remaining jobs even if some fail
- Track failed jobs with error details
- Set batch status to 'partial' if some jobs succeed and some fail
- Set batch status to 'failed' if all jobs fail
- Set batch status to 'completed' if all jobs succeed

### Example
```typescript
// Batch of 5 videos
// 3 succeed, 2 fail
// Batch status: 'partial'
// Progress: { total: 5, completed: 3, failed: 2, pending: 0, percentage: 100 }
```

## Testing Strategy

### Unit Tests
- Test batch creation
- Test progress calculation
- Test status determination
- Test cancellation logic
- Test partial failure scenarios

### Integration Tests
- Test complete batch workflow
- Test parallel processing
- Test with real repository
- Test with mock Sora client
- Test error scenarios

### Performance Tests
- Test with maximum batch size (10 videos)
- Test concurrency limits
- Test memory usage
- Test with slow responses

## Usage Examples

### Create and Process Batch
```typescript
import { getBatchService } from './services';

const batchService = getBatchService();

// Create batch
const batch = await batchService.createBatch({
  videos: [
    { prompt: 'A sunset over the ocean', duration: 10 },
    { prompt: 'A mountain landscape', duration: 15 },
    { prompt: 'City lights at night', duration: 12 },
  ],
  batchName: 'Nature scenes',
  metadata: { createdBy: 'user123' },
});

console.log(`Batch created: ${batch.id}`);
console.log(`Job IDs: ${batch.jobIds.join(', ')}`);

// Process batch (async)
batchService.processBatch(batch.id, 3).then(() => {
  console.log('Batch processing complete');
});

// Check status
const status = await batchService.getBatchStatus(batch.id);
console.log(`Progress: ${status.progress.percentage}%`);
console.log(`Completed: ${status.progress.completed}/${status.progress.total}`);
```

### Monitor Batch Progress
```typescript
async function monitorBatch(batchId: string): Promise<void> {
  const interval = setInterval(async () => {
    const status = await batchService.getBatchStatus(batchId);

    console.log(`Status: ${status.status}`);
    console.log(`Progress: ${status.progress.percentage}%`);

    if (['completed', 'partial', 'failed', 'cancelled'].includes(status.status)) {
      clearInterval(interval);
      console.log('Batch finished');
    }
  }, 5000); // Check every 5 seconds
}
```

## Configuration

Add to `.env`:
```bash
# Batch Processing
BATCH_MAX_SIZE=10
BATCH_CONCURRENCY=3
BATCH_TIMEOUT=300000  # 5 minutes
```

## Definition of Done

### Code Quality
- [ ] All TypeScript files pass linting
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors
- [ ] All methods have JSDoc

### Testing
- [ ] Unit tests for batch service
- [ ] Integration tests with repository
- [ ] Tests for parallel processing
- [ ] Tests for partial failures
- [ ] Tests for cancellation
- [ ] All tests passing
- [ ] Test coverage >= 70%

### Functionality
- [ ] Batch creation working
- [ ] Parallel processing working
- [ ] Progress tracking accurate
- [ ] Partial failure handling correct
- [ ] Batch cancellation working
- [ ] Status calculations correct

### Documentation
- [ ] All methods documented
- [ ] Create /docs/US-009-batch-service-guide.md
- [ ] Usage examples included
- [ ] Error scenarios documented

### Integration
- [ ] Batch repository integrated
- [ ] Video service integrated
- [ ] Error handling integrated
- [ ] Logging integrated

## Verification Steps

1. **Create Small Batch**
   ```bash
   # Create batch with 3 videos
   # Verify all jobs created
   # Check batch status
   ```

2. **Create Maximum Batch**
   ```bash
   # Create batch with 10 videos
   # Verify all jobs created
   # Check concurrency respected
   ```

3. **Test Partial Failure**
   ```bash
   # Mock 2 jobs to fail, 3 to succeed
   # Verify batch status is 'partial'
   # Verify progress tracking correct
   ```

4. **Test Cancellation**
   ```bash
   # Create batch
   # Cancel while processing
   # Verify all jobs cancelled
   ```

5. **Run All Tests**
   ```bash
   npm test tests/unit/services/BatchService.test.ts
   npm test tests/integration/services/BatchService.integration.test.ts
   ```

## Notes for Developers

- Batch size limited to 1-10 videos
- Concurrency prevents overwhelming Sora API
- Partial failures are normal and handled gracefully
- Progress updates in real-time
- Batch metadata stored with batch
- Individual job metadata stored with jobs
- Use Promise.race for concurrency control
- Always handle individual job errors
- Batch operations are async (non-blocking)

## Related Documentation

- `/docs/US-009-batch-service-guide.md` (to be created)
- For complete implementation: [../REMAINING-USER-STORIES.md](../REMAINING-USER-STORIES.md#us-009-batch-processing-service)
- Video Service: [../US-008-Video-Generation-Service/README.md](../US-008-Video-Generation-Service/README.md)
