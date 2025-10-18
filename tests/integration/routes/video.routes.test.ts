/**
 * Video routes integration tests
 */
import { buildApp } from '../../../src/app.js';
import { validVideoRequest, validBatchRequest, testApiKey } from '../../fixtures/testData.js';

describe('Video Routes Integration Tests', () => {
  describe('POST /api/v1/videos', () => {
    it('should create a video job with valid request', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/videos',
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: validVideoRequest,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBeDefined();
      expect(body.data.status).toBe('pending');

      await app.close();
    });

    it('should return 401 without API key', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/videos',
        headers: {
          'content-type': 'application/json',
        },
        payload: validVideoRequest,
      });

      expect(response.statusCode).toBe(401);

      await app.close();
    });

    it('should return 400 with invalid request', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/videos',
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: { prompt: '' },
      });

      expect(response.statusCode).toBe(400);

      await app.close();
    });
  });

  describe('POST /api/v1/videos/batch', () => {
    it('should create a batch with valid request', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/videos/batch',
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: validBatchRequest,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.batchId).toBeDefined();
      expect(body.data.jobIds).toHaveLength(2);

      await app.close();
    });
  });

  describe('GET /api/v1/videos/:jobId', () => {
    it('should get job status', async () => {
      const app = await buildApp();

      // Create a job first
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

      // Get job status
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/videos/${jobId}`,
        headers: {
          'x-api-key': testApiKey,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(jobId);
      expect(body.data.status).toBeDefined();

      await app.close();
    });

    it('should return 404 for non-existent job', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/videos/non-existent-id',
        headers: {
          'x-api-key': testApiKey,
        },
      });

      expect(response.statusCode).toBe(404);

      await app.close();
    });
  });

  describe('GET /api/v1/videos', () => {
    it('should list jobs', async () => {
      const app = await buildApp();

      // Create some jobs first
      await app.inject({
        method: 'POST',
        url: '/api/v1/videos',
        headers: {
          'x-api-key': testApiKey,
          'content-type': 'application/json',
        },
        payload: validVideoRequest,
      });

      // List jobs
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/videos',
        headers: {
          'x-api-key': testApiKey,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();

      await app.close();
    });

    it('should support pagination', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/videos?page=1&limit=10',
        headers: {
          'x-api-key': testApiKey,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);

      await app.close();
    });
  });

  describe('DELETE /api/v1/videos/:jobId', () => {
    it('should cancel a job', async () => {
      const app = await buildApp();

      // Create a job first
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

      // Cancel the job
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/videos/${jobId}`,
        headers: {
          'x-api-key': testApiKey,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('cancelled');

      await app.close();
    });
  });
});
