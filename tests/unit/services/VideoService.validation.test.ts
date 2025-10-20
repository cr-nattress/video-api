/**
 * VideoService validation unit tests
 * Tests Sora v1 API constraint enforcement
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { VideoService } from '../../../src/services/VideoService.js';
import { MockSoraClient } from '../../../src/clients/MockSoraClient.js';
import { InMemoryJobRepository } from '../../../src/repositories/InMemoryJobRepository.js';
import { ValidationError } from '../../../src/errors/index.js';
import { CreateVideoRequest } from '../../../src/models/index.js';

describe('VideoService - Validation Tests', () => {
  let videoService: VideoService;
  let mockClient: MockSoraClient;
  let repository: InMemoryJobRepository;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    mockClient = new MockSoraClient();
    videoService = new VideoService(repository, mockClient);
  });

  describe('Prompt Validation', () => {
    it('should reject empty prompt', async () => {
      const request: CreateVideoRequest = {
        prompt: '',
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
      await expect(videoService.createVideo(request)).rejects.toThrow('Prompt is required');
    });

    it('should reject whitespace-only prompt', async () => {
      const request: CreateVideoRequest = {
        prompt: '   ',
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
      await expect(videoService.createVideo(request)).rejects.toThrow('Prompt is required');
    });

    it('should reject prompt longer than 1000 characters', async () => {
      const request: CreateVideoRequest = {
        prompt: 'a'.repeat(1001),
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
      await expect(videoService.createVideo(request)).rejects.toThrow(
        'Prompt must be less than 1000 characters'
      );
    });

    it('should accept valid prompt', async () => {
      const request: CreateVideoRequest = {
        prompt: 'A beautiful sunset over the ocean',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
      expect(job.prompt).toBe(request.prompt);
    });

    it('should accept prompt at max length (1000 chars)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'a'.repeat(1000),
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });
  });

  describe('Duration Validation (Sora v1: 1-20 seconds)', () => {
    it('should reject duration less than 1 second', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: 0,
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
      await expect(videoService.createVideo(request)).rejects.toThrow(
        'Duration must be between 1 and 20 seconds per Sora v1 specification'
      );
    });

    it('should reject negative duration', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: -5,
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
    });

    it('should reject duration greater than 20 seconds', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: 21,
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
      await expect(videoService.createVideo(request)).rejects.toThrow(
        'Duration must be between 1 and 20 seconds per Sora v1 specification'
      );
    });

    it('should reject duration of 60 seconds (old v2 limit)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: 60,
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
      await expect(videoService.createVideo(request)).rejects.toThrow('1 and 20 seconds');
    });

    it('should reject non-integer duration', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: 5.5,
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
      await expect(videoService.createVideo(request)).rejects.toThrow('Duration must be an integer');
    });

    it('should accept duration of 1 second (minimum)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: 1,
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept duration of 20 seconds (maximum)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: 20,
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept duration of 10 seconds (middle range)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        duration: 10,
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept undefined duration (uses API default)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });
  });

  describe('Resolution Validation (Sora v1: max 1080p)', () => {
    it('should accept 480p resolution', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        resolution: '480p',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept 720p resolution', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        resolution: '720p',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept 1080p resolution', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        resolution: '1080p',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept undefined resolution (uses API default)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });
  });

  describe('Aspect Ratio Validation', () => {
    it('should accept 16:9 aspect ratio', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        aspectRatio: '16:9',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept 9:16 aspect ratio', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        aspectRatio: '9:16',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept 1:1 aspect ratio', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        aspectRatio: '1:1',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept 4:3 aspect ratio', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        aspectRatio: '4:3',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept undefined aspect ratio (uses API default)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });
  });

  describe('Combined Validation Scenarios', () => {
    it('should accept valid request with all parameters', async () => {
      const request: CreateVideoRequest = {
        prompt: 'A rocket landing on Mars with dust clouds',
        duration: 10,
        resolution: '1080p',
        aspectRatio: '16:9',
        style: 'cinematic',
        priority: 'normal',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
      expect(job.prompt).toBe(request.prompt);
    });

    it('should accept minimal valid request (prompt only)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Simple test',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should reject request with multiple validation errors', async () => {
      const request: CreateVideoRequest = {
        prompt: '', // Invalid: empty
        duration: 100, // Invalid: > 20 seconds
      };

      await expect(videoService.createVideo(request)).rejects.toThrow(ValidationError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle prompt with special characters', async () => {
      const request: CreateVideoRequest = {
        prompt: 'A video with special chars: @#$%^&*()[]{}|\\/<>?',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should handle prompt with unicode characters', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Une vidéo avec des caractères spéciaux: 日本語 中文 한글',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should handle prompt with newlines and tabs', async () => {
      const request: CreateVideoRequest = {
        prompt: 'A video\nwith\tnewlines\rand\ttabs',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });
  });

  describe('Priority Validation', () => {
    it('should accept low priority', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        priority: 'low',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept normal priority', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        priority: 'normal',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept high priority', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
        priority: 'high',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });

    it('should accept undefined priority (defaults to normal)', async () => {
      const request: CreateVideoRequest = {
        prompt: 'Test video',
      };

      const job = await videoService.createVideo(request);
      expect(job).toBeDefined();
    });
  });
});
