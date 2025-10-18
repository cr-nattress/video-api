/**
 * Test fixtures and data
 */
import { CreateVideoRequest, BatchVideoRequest } from '../../src/models/index.js';

export const validVideoRequest: CreateVideoRequest = {
  prompt: 'A beautiful sunset over the ocean',
  duration: 10,
  resolution: '1080p',
  aspectRatio: '16:9',
  priority: 'normal',
};

export const validBatchRequest: BatchVideoRequest = {
  name: 'Test Batch',
  videos: [
    {
      prompt: 'A cat playing with a ball',
      duration: 5,
    },
    {
      prompt: 'A dog running in a park',
      duration: 10,
    },
  ],
  priority: 'normal',
};

export const invalidVideoRequest = {
  prompt: '', // Invalid: empty prompt
};

export const testApiKey = 'test-api-key';
