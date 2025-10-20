/**
 * Sora v1 API client implementation with retry logic
 * Model: sora-1-turbo
 * Base URL: https://api.openai.com/v1
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { ISoraClient } from './ISoraClient.js';
import {
  SoraVideoRequest,
  SoraJobResponse,
  SoraCreateResponse,
  isSoraError,
  mapResolutionToSize,
  mapAspectRatioToSize,
} from '../types/index.js';
import { ExternalAPIError } from '../errors/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class SoraClient implements ISoraClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private baseDelay: number = 1000; // 1 second

  constructor() {
    this.maxRetries = config.openai.maxRetries;
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1', // Sora v1 base URL
      timeout: config.openai.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openai.apiKey}`, // Bearer token auth
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(
          {
            method: config.method,
            url: config.url,
            baseURL: config.baseURL,
          },
          'Sora API request',
        );
        return config;
      },
      (error) => {
        logger.error({ error }, 'Sora API request error');
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(
          {
            status: response.status,
            url: response.config.url,
          },
          'Sora API response',
        );
        return response;
      },
      (error) => {
        logger.error(
          {
            status: error.response?.status,
            url: error.config?.url,
            error: error.response?.data,
          },
          'Sora API response error',
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    attempt: number = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        logger.error(
          {
            operation: operationName,
            attempts: attempt + 1,
            error,
          },
          'Max retry attempts reached',
        );
        throw this.transformError(error, operationName);
      }

      // Check if error is retryable
      if (!this.isRetryableError(error)) {
        throw this.transformError(error, operationName);
      }

      // Calculate delay with exponential backoff
      const delay = this.baseDelay * Math.pow(2, attempt);
      logger.warn(
        {
          operation: operationName,
          attempt: attempt + 1,
          delay,
        },
        `Retrying operation after ${delay}ms`,
      );

      await this.sleep(delay);
      return this.retryWithBackoff(operation, operationName, attempt + 1);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Retry on network errors, 429 (rate limit), or 5xx server errors
      return !status || status === 429 || status >= 500;
    }
    return false;
  }

  /**
   * Transform axios error to application error
   */
  private transformError(error: unknown, operation: string): ExternalAPIError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 502;
      const data = axiosError.response?.data;

      if (isSoraError(data)) {
        return new ExternalAPIError('Sora API', data.error.message, status, data.error.details);
      }

      return new ExternalAPIError(
        'Sora API',
        axiosError.message || 'Unknown error occurred',
        status,
        { operation },
      );
    }

    return new ExternalAPIError('Sora API', 'Unknown error occurred', 502, { operation });
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate request against Sora v1 API constraints
   */
  private validateRequest(request: SoraVideoRequest): void {
    // Validate n_seconds (Sora v1: 1-20 seconds)
    if (request.n_seconds !== undefined) {
      if (request.n_seconds < 1 || request.n_seconds > 20) {
        throw new ExternalAPIError(
          'Sora API',
          'n_seconds must be between 1 and 20 for Sora v1',
          400,
          { field: 'n_seconds', value: request.n_seconds }
        );
      }
    }

    // Validate duration (legacy field, maps to n_seconds)
    if (request.duration !== undefined) {
      if (request.duration < 1 || request.duration > 20) {
        throw new ExternalAPIError(
          'Sora API',
          'duration must be between 1 and 20 seconds for Sora v1',
          400,
          { field: 'duration', value: request.duration }
        );
      }
    }

    // Validate n_variants (Sora v1: 1-4, but 1080p only supports 1)
    if (request.n_variants !== undefined) {
      if (request.n_variants < 1 || request.n_variants > 4) {
        throw new ExternalAPIError(
          'Sora API',
          'n_variants must be between 1 and 4',
          400,
          { field: 'n_variants', value: request.n_variants }
        );
      }
      if (!Number.isInteger(request.n_variants)) {
        throw new ExternalAPIError(
          'Sora API',
          'n_variants must be an integer',
          400,
          { field: 'n_variants', value: request.n_variants }
        );
      }
    }

    // Validate width and height (Sora v1: max 1080p = 2,073,600 pixels)
    if (request.width !== undefined && request.height !== undefined) {
      const totalPixels = request.width * request.height;
      const MAX_PIXELS = 1920 * 1080; // 2,073,600 pixels (1080p)

      if (totalPixels > MAX_PIXELS) {
        throw new ExternalAPIError(
          'Sora API',
          `Total pixels (${totalPixels}) exceeds Sora v1 maximum of ${MAX_PIXELS} (1080p). Reduce width or height.`,
          400,
          {
            field: 'resolution',
            width: request.width,
            height: request.height,
            totalPixels,
            maxPixels: MAX_PIXELS
          }
        );
      }

      if (request.width < 1 || request.height < 1) {
        throw new ExternalAPIError(
          'Sora API',
          'width and height must be positive integers',
          400,
          { width: request.width, height: request.height }
        );
      }
    }

    // Validate model (must be sora-1-turbo)
    if (request.model && request.model !== 'sora-1-turbo') {
      throw new ExternalAPIError(
        'Sora API',
        'Only "sora-1-turbo" model is supported in Sora v1',
        400,
        { field: 'model', value: request.model }
      );
    }
  }

  /**
   * Map legacy request parameters to Sora v1 format
   */
  private mapRequestToV1(request: SoraVideoRequest): Record<string, unknown> {
    // Determine width and height
    let width = request.width;
    let height = request.height;

    // If width/height not specified, try to derive from resolution or aspectRatio
    if (!width || !height) {
      if (request.resolution) {
        const size = mapResolutionToSize(request.resolution);
        width = size.width;
        height = size.height;
      } else if (request.aspectRatio) {
        const size = mapAspectRatioToSize(request.aspectRatio);
        width = size.width;
        height = size.height;
      } else {
        // Default to 1080p square
        width = 1080;
        height = 1080;
      }
    }

    // Build Sora v1 request body
    const v1Request: Record<string, unknown> = {
      model: request.model || 'sora-1-turbo', // Default to sora-1-turbo
      prompt: request.prompt,
      width,
      height,
    };

    // Add optional parameters if provided
    if (request.n_seconds !== undefined) {
      v1Request.n_seconds = request.n_seconds;
    } else if (request.duration !== undefined) {
      // Legacy: map duration to n_seconds
      v1Request.n_seconds = request.duration;
    }

    if (request.n_variants !== undefined) {
      v1Request.n_variants = request.n_variants;
    }

    // Advanced fields (if supported by API)
    if (request.seed !== undefined) {
      v1Request.seed = request.seed;
    }

    return v1Request;
  }

  /**
   * Create a new video generation job
   * POST /v1/videos
   */
  async createVideo(request: SoraVideoRequest): Promise<SoraCreateResponse> {
    // Validate request against Sora v1 constraints
    this.validateRequest(request);

    // Generate idempotency key if not provided
    const idempotencyKey = request.idempotencyKey || randomUUID();

    return this.retryWithBackoff(async () => {
      logger.info(
        {
          prompt: request.prompt,
          idempotencyKey,
        },
        'Creating video via Sora v1 API',
      );

      const v1Request = this.mapRequestToV1(request);

      const response = await this.client.post<SoraCreateResponse>('/videos', v1Request, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      logger.info(
        {
          jobId: response.data.id,
          status: response.data.status,
          idempotencyKey,
        },
        'Video creation job initiated',
      );

      return response.data;
    }, 'createVideo');
  }

  /**
   * Get video generation job status
   * GET /v1/videos/{id}
   */
  async getVideoStatus(jobId: string): Promise<SoraJobResponse> {
    return this.retryWithBackoff(async () => {
      logger.debug({ jobId }, 'Fetching video status from Sora v1 API');

      const response = await this.client.get<SoraJobResponse>(`/videos/${jobId}`);

      logger.debug(
        {
          jobId,
          status: response.data.status,
        },
        'Video status fetched',
      );

      return response.data;
    }, 'getVideoStatus');
  }

  /**
   * Cancel a video generation job
   * DELETE /v1/videos/{id}
   */
  async cancelVideo(jobId: string): Promise<void> {
    return this.retryWithBackoff(async () => {
      logger.info({ jobId }, 'Cancelling video via Sora v1 API');

      await this.client.delete(`/videos/${jobId}`);

      logger.info({ jobId }, 'Video cancellation requested');
    }, 'cancelVideo');
  }

  /**
   * Download video content
   * GET /v1/videos/{id}/content
   * Returns binary video file (MP4)
   */
  async downloadVideo(jobId: string): Promise<Buffer> {
    return this.retryWithBackoff(async () => {
      logger.info({ jobId }, 'Downloading video from Sora v1 API');

      const response = await this.client.get(`/videos/${jobId}/content`, {
        responseType: 'arraybuffer',
      });

      logger.info({ jobId, size: response.data.length }, 'Video download completed');

      return Buffer.from(response.data);
    }, 'downloadVideo');
  }

  /**
   * Health check for Sora API
   * Note: Sora v1 may not have a dedicated /health endpoint
   * This attempts a lightweight check or returns false
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to call a lightweight endpoint (may not exist in Sora v1)
      // If it fails, we assume the API is unavailable
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch (error) {
      logger.warn({ error }, 'Sora API health check failed (endpoint may not exist in v1)');
      return false;
    }
  }
}
