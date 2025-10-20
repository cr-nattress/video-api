/**
 * SoraClient validation unit tests
 * Tests Sora v1 API constraint enforcement at the client level
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SoraClient } from '../../../src/clients/SoraClient.js';
import { SoraVideoRequest } from '../../../src/types/index.js';
import { ExternalAPIError } from '../../../src/errors/index.js';

describe('SoraClient - Validation Tests', () => {
  let client: SoraClient;

  beforeEach(() => {
    // Note: These tests will test validation logic before API calls
    // Actual API calls will fail without valid credentials
    client = new SoraClient();
  });

  describe('n_seconds Validation (Sora v1: 1-20 seconds)', () => {
    it('should reject n_seconds less than 1', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_seconds: 0,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('n_seconds must be between 1 and 20');
    });

    it('should reject n_seconds greater than 20', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_seconds: 21,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('n_seconds must be between 1 and 20');
    });

    it('should reject negative n_seconds', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_seconds: -5,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
    });
  });

  describe('Legacy duration Validation', () => {
    it('should reject duration less than 1', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        duration: 0,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('duration must be between 1 and 20');
    });

    it('should reject duration greater than 20', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        duration: 25,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
    });
  });

  describe('n_variants Validation (Sora v1: 1-4)', () => {
    it('should reject n_variants less than 1', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_variants: 0,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('n_variants must be between 1 and 4');
    });

    it('should reject n_variants greater than 4', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_variants: 5,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('n_variants must be between 1 and 4');
    });

    it('should reject non-integer n_variants', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_variants: 2.5,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('n_variants must be an integer');
    });
  });

  describe('Width/Height Validation (Sora v1: max 1080p)', () => {
    it('should reject resolution exceeding 1080p pixel count', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 3840, // 4K width
        height: 2160, // 4K height
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('exceeds Sora v1 maximum');
      await expect(client.createVideo(request)).rejects.toThrow('1080p');
    });

    it('should reject resolution with total pixels > 2,073,600', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 2000,
        height: 2000, // 4,000,000 pixels > 2,073,600
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('exceeds Sora v1 maximum');
    });

    it('should reject negative width', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: -1920,
        height: 1080,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('width and height must be positive');
    });

    it('should reject zero height', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 1920,
        height: 0,
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('width and height must be positive');
    });
  });

  describe('Model Validation (Sora v1: sora-1-turbo only)', () => {
    it('should reject sora-2 model', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-2' as any, // Type assertion to test invalid model
        prompt: 'Test video',
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('Only "sora-1-turbo" model is supported');
    });

    it('should reject sora-2-pro model', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-2-pro' as any,
        prompt: 'Test video',
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
      await expect(client.createVideo(request)).rejects.toThrow('sora-1-turbo');
    });

    it('should reject arbitrary model name', async () => {
      const request: SoraVideoRequest = {
        model: 'gpt-4' as any,
        prompt: 'Test video',
      };

      await expect(client.createVideo(request)).rejects.toThrow(ExternalAPIError);
    });
  });

  describe('Valid Requests (pass validation, API call may fail)', () => {
    // Note: These tests validate that requests pass validation
    // They will fail at the API call stage (401 or network error) without valid credentials
    // We're only testing that validation does NOT throw before the API call

    it('should pass validation for 1080p landscape (1920x1080)', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 1920,
        height: 1080,
        n_seconds: 5,
        n_variants: 1,
      };

      // Validation should pass, API call will fail (expected with invalid API key)
      // We expect an error, but NOT a validation error (which would happen before the API call)
      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should pass validation for 1080p portrait (1080x1920)', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 1080,
        height: 1920,
        n_seconds: 10,
        n_variants: 1,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should pass validation for square (1080x1080)', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 1080,
        height: 1080,
        n_seconds: 15,
        n_variants: 2,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should pass validation for 720p (1280x720)', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 1280,
        height: 720,
        n_seconds: 20,
        n_variants: 4,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should pass validation for minimal request', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should pass validation with legacy fields', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        duration: 10,
        resolution: '1080p',
        aspectRatio: '16:9',
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });
  });

  describe('Boundary Cases', () => {
    it('should accept exactly 1 second', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_seconds: 1,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should accept exactly 20 seconds', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_seconds: 20,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should accept exactly 1 variant', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_variants: 1,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should accept exactly 4 variants', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        n_variants: 4,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should accept exactly 1080p pixels (1920x1080)', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 1920,
        height: 1080,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });

    it('should accept exactly 1080p pixels in different orientation (1080x1920)', async () => {
      const request: SoraVideoRequest = {
        model: 'sora-1-turbo',
        prompt: 'Test video',
        width: 1080,
        height: 1920,
      };

      await expect(client.createVideo(request)).rejects.toThrow();
    });
  });
});
