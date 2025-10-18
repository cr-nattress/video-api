/**
 * End-to-end tests for complete video workflows
 */
import { buildApp } from '../../src/app.js';
import { validVideoRequest, testApiKey } from '../fixtures/testData.js';

describe('Video Generation E2E Workflow', () => {
  it('should complete a full video generation workflow', async () => {
    const app = await buildApp();

    // Step 1: Create a video job
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': testApiKey,
        'content-type': 'application/json',
      },
      payload: validVideoRequest,
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    const jobId = createBody.data.jobId;

    // Step 2: Check job status
    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': testApiKey,
      },
    });

    expect(statusResponse.statusCode).toBe(200);
    const statusBody = JSON.parse(statusResponse.body);
    expect(statusBody.data.id).toBe(jobId);
    expect(statusBody.data.status).toBeDefined();

    // Step 3: List jobs to verify it appears
    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': testApiKey,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    const listBody = JSON.parse(listResponse.body);
    const foundJob = listBody.data.find((job: { id: string }) => job.id === jobId);
    expect(foundJob).toBeDefined();

    await app.close();
  });

  it('should handle batch video generation workflow', async () => {
    const app = await buildApp();

    // Step 1: Create a batch
    const batchRequest = {
      name: 'E2E Test Batch',
      videos: [
        { prompt: 'Video 1', duration: 5 },
        { prompt: 'Video 2', duration: 10 },
        { prompt: 'Video 3', duration: 15 },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/videos/batch',
      headers: {
        'x-api-key': testApiKey,
        'content-type': 'application/json',
      },
      payload: batchRequest,
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    const batchId = createBody.data.batchId;
    expect(createBody.data.jobIds).toHaveLength(3);

    // Step 2: Check batch status
    const batchStatusResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/batches/${batchId}`,
      headers: {
        'x-api-key': testApiKey,
      },
    });

    expect(batchStatusResponse.statusCode).toBe(200);
    const batchStatusBody = JSON.parse(batchStatusResponse.body);
    expect(batchStatusBody.data.id).toBe(batchId);
    expect(batchStatusBody.data.progress).toBeDefined();
    expect(batchStatusBody.data.progress.total).toBe(3);

    // Step 3: Verify all jobs exist
    for (const jobId of createBody.data.jobIds) {
      const jobResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/videos/${jobId}`,
        headers: {
          'x-api-key': testApiKey,
        },
      });

      expect(jobResponse.statusCode).toBe(200);
    }

    await app.close();
  });

  it('should handle job cancellation workflow', async () => {
    const app = await buildApp();

    // Step 1: Create a job
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/videos',
      headers: {
        'x-api-key': testApiKey,
        'content-type': 'application/json',
      },
      payload: validVideoRequest,
    });

    const createBody = JSON.parse(createResponse.body);
    const jobId = createBody.data.jobId;

    // Step 2: Cancel the job
    const cancelResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': testApiKey,
      },
    });

    expect(cancelResponse.statusCode).toBe(200);
    const cancelBody = JSON.parse(cancelResponse.body);
    expect(cancelBody.data.status).toBe('cancelled');

    // Step 3: Verify job is cancelled
    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/videos/${jobId}`,
      headers: {
        'x-api-key': testApiKey,
      },
    });

    const statusBody = JSON.parse(statusResponse.body);
    expect(statusBody.data.status).toBe('cancelled');

    await app.close();
  });
});
