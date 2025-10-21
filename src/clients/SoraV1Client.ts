/**
 * Sora 1 API client implementation with retry logic
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
} from '../types/index.js';
import { ExternalAPIError } from '../errors/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { appendSoraRequest, appendSoraResponse, appendSoraError } from '../utils/fileLogger.js';

/**
 * Sora 1 specific request format
 */
interface SoraV1Request {
  model: 'sora-1-turbo';
  prompt: string;
  n_seconds?: number;
  width?: number;
  height?: number;
  n_variants?: number;
}

/**
 * Sora 1 specific response format
 */
interface SoraV1JobResponse {
  object: 'video.generation.job';
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  created_at: number;
  finished_at: number | null;
  expires_at: number | null;
  generations: Array<{
    id: string;
    video_url: string;
  }>;
  prompt: string;
  model: string;
  n_variants: number;
  n_seconds: number;
  height: number;
  width: number;
  failure_reason: string | null;
}

export class SoraV1Client implements ISoraClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private baseDelay: number = 1000; // 1 second

  constructor() {
    logger.info('🔵 CHECKPOINT: SoraV1Client constructor called');
    this.maxRetries = config.openai.maxRetries;
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      timeout: config.openai.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openai.apiKey}`,
      },
    });
    logger.info('🔵 CHECKPOINT: SoraV1Client initialized successfully', {
      baseURL: 'https://api.openai.com/v1',
      maxRetries: this.maxRetries,
      timeout: config.openai.timeout,
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
          'Sora v1 API request',
        );
        return config;
      },
      (error) => {
        logger.error({ error }, 'Sora v1 API request error');
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
          'Sora v1 API response',
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
          'Sora v1 API response error',
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
        return new ExternalAPIError('Sora v1 API', data.error.message, status, data.error.details);
      }

      return new ExternalAPIError(
        'Sora v1 API',
        axiosError.message || 'Unknown error occurred',
        status,
        { operation },
      );
    }

    return new ExternalAPIError('Sora v1 API', 'Unknown error occurred', 502, { operation });
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate request against Sora v1 constraints
   */
  private validateRequest(request: SoraVideoRequest): void {
    // Validate prompt
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new ExternalAPIError('Sora v1 API', 'Prompt is required', 400);
    }

    if (request.prompt.length > 1000) {
      throw new ExternalAPIError('Sora v1 API', 'Prompt must be less than 1000 characters', 400);
    }

    // Validate model (must be sora-1-turbo)
    if (request.model && request.model !== 'sora-1-turbo') {
      throw new ExternalAPIError(
        'Sora v1 API',
        'Only "sora-1-turbo" model is supported',
        400,
        { field: 'model', value: request.model, allowed: ['sora-1-turbo'] }
      );
    }

    // Validate n_seconds (Sora v1: 1-20 seconds)
    if (request.duration !== undefined) {
      if (request.duration < 1 || request.duration > 20) {
        throw new ExternalAPIError(
          'Sora v1 API',
          'Duration must be between 1 and 20 seconds',
          400,
          { field: 'duration', value: request.duration, min: 1, max: 20 }
        );
      }
      if (!Number.isInteger(request.duration)) {
        throw new ExternalAPIError(
          'Sora v1 API',
          'Duration must be an integer',
          400,
          { field: 'duration', value: request.duration }
        );
      }
    }

    // Validate width and height if provided
    if (request.width !== undefined && (request.width < 1 || request.width > 1920)) {
      throw new ExternalAPIError(
        'Sora v1 API',
        'Width must be between 1 and 1920 pixels',
        400,
        { field: 'width', value: request.width, min: 1, max: 1920 }
      );
    }

    if (request.height !== undefined && (request.height < 1 || request.height > 1920)) {
      throw new ExternalAPIError(
        'Sora v1 API',
        'Height must be between 1 and 1920 pixels',
        400,
        { field: 'height', value: request.height, min: 1, max: 1920 }
      );
    }
  }

  /**
   * Map generic request to Sora v1 format
   */
  private mapRequestToSoraV1(request: SoraVideoRequest): SoraV1Request {
    logger.debug(
      {
        inputRequest: {
          width: request.width,
          height: request.height,
          resolution: request.resolution,
          aspectRatio: request.aspectRatio,
          duration: request.duration,
        },
      },
      '[SoraV1Client] Starting request mapping to Sora v1 format',
    );

    // Map resolution to width/height if resolution is provided
    let width = request.width;
    let height = request.height;
    let mappingSource = 'direct';

    if (!width || !height) {
      // Map resolution string to dimensions
      if (request.resolution === '1080p') {
        width = 1920;
        height = 1080;
        mappingSource = 'resolution:1080p';
      } else if (request.resolution === '720p') {
        width = 1280;
        height = 720;
        mappingSource = 'resolution:720p';
      } else if (request.resolution === '480p') {
        width = 854;
        height = 480;
        mappingSource = 'resolution:480p';
      } else if (request.aspectRatio) {
        // Map aspect ratio to default dimensions
        if (request.aspectRatio === '16:9') {
          width = 1280;
          height = 720;
          mappingSource = 'aspectRatio:16:9';
        } else if (request.aspectRatio === '9:16') {
          width = 720;
          height = 1280;
          mappingSource = 'aspectRatio:9:16';
        } else if (request.aspectRatio === '1:1') {
          width = 1080;
          height = 1080;
          mappingSource = 'aspectRatio:1:1';
        } else if (request.aspectRatio === '4:3') {
          width = 1024;
          height = 768;
          mappingSource = 'aspectRatio:4:3';
        }
      }
    }

    // Default to 1080x1080 (square) if not specified
    if (!width) {
      width = 1080;
      mappingSource = 'default';
    }
    if (!height) {
      height = 1080;
      mappingSource = 'default';
    }

    logger.debug(
      {
        mappedDimensions: { width, height },
        mappingSource,
      },
      '[SoraV1Client] Mapped dimensions from input',
    );

    // Build Sora v1 request
    const soraV1Request: SoraV1Request = {
      model: 'sora-1-turbo',
      prompt: request.prompt,
      width,
      height,
    };

    // Add optional parameters
    if (request.duration !== undefined) {
      soraV1Request.n_seconds = request.duration;
      logger.debug({ n_seconds: request.duration }, '[SoraV1Client] Mapped duration to n_seconds');
    }

    // n_variants defaults to 1
    soraV1Request.n_variants = 1;

    logger.debug(
      {
        finalSoraV1Request: soraV1Request,
      },
      '[SoraV1Client] Completed request mapping to Sora v1 format',
    );

    return soraV1Request;
  }

  /**
   * Map Sora v1 response to generic format
   */
  private mapSoraV1ToGeneric(v1Response: SoraV1JobResponse): SoraJobResponse {
    return {
      object: 'video.generation.job',
      id: v1Response.id,
      status: v1Response.status,
      created_at: v1Response.created_at,
      finished_at: v1Response.finished_at,
      expires_at: v1Response.expires_at,
      generations: v1Response.generations,
      prompt: v1Response.prompt,
      model: v1Response.model,
      // Map Sora v1 format to generic format
      size: `${v1Response.width}x${v1Response.height}`,
      seconds: String(v1Response.n_seconds),
      width: v1Response.width,
      height: v1Response.height,
      n_seconds: v1Response.n_seconds,
      failure_reason: v1Response.failure_reason,
    };
  }

  /**
   * Create a new video generation job
   * POST /v1/videos
   */
  async createVideo(request: SoraVideoRequest, internalJobId?: string): Promise<SoraCreateResponse> {
    logger.info('🟢 CHECKPOINT: SoraV1Client.createVideo() method called', {
      internalJobId,
      prompt: request.prompt,
    });

    // Log incoming request details
    logger.info(
      {
        internalJobId,
        originalRequest: {
          prompt: request.prompt,
          model: request.model,
          duration: request.duration,
          resolution: request.resolution,
          aspectRatio: request.aspectRatio,
          width: request.width,
          height: request.height,
        },
      },
      '[SoraV1Client] Received createVideo request',
    );

    // Validate request against Sora v1 constraints
    logger.debug({ internalJobId }, '[SoraV1Client] Validating request against Sora v1 constraints');
    this.validateRequest(request);
    logger.debug({ internalJobId }, '[SoraV1Client] Request validation passed');

    // Generate idempotency key if not provided
    const idempotencyKey = request.idempotencyKey || randomUUID();
    logger.debug({ internalJobId, idempotencyKey }, '[SoraV1Client] Generated idempotency key');

    const startTime = Date.now();

    return this.retryWithBackoff(async () => {
      logger.info(
        {
          prompt: request.prompt,
          idempotencyKey,
          internalJobId,
        },
        '[SoraV1Client] Starting Sora v1 API call',
      );

      // Map generic request to Sora v1 format
      logger.debug({ internalJobId }, '[SoraV1Client] Mapping generic request to Sora v1 format');
      const soraV1Request = this.mapRequestToSoraV1(request);

      // Log the transformed Sora v1 request
      logger.info(
        {
          internalJobId,
          soraV1Request: {
            model: soraV1Request.model,
            prompt: soraV1Request.prompt,
            width: soraV1Request.width,
            height: soraV1Request.height,
            n_seconds: soraV1Request.n_seconds,
            n_variants: soraV1Request.n_variants,
          },
        },
        '[SoraV1Client] Transformed request to Sora v1 format',
      );

      // Log the exact request being sent to Sora (file logging)
      if (internalJobId) {
        try {
          await appendSoraRequest(internalJobId, {
            url: `${this.client.defaults.baseURL}/videos`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.client.defaults.headers.common['Authorization'] as string,
              'Idempotency-Key': idempotencyKey,
            },
            body: soraV1Request,
          });
          logger.debug({ internalJobId }, '[SoraV1Client] Logged request to file');
        } catch (logError) {
          logger.warn({ internalJobId, error: logError }, '[SoraV1Client] Failed to log Sora v1 request to file');
        }
      }

      try {
        // Log right before making the API call
        logger.info(
          {
            internalJobId,
            url: `${this.client.defaults.baseURL}/videos`,
            method: 'POST',
          },
          '[SoraV1Client] Sending POST request to Sora v1 API',
        );

        logger.info('🟡 CHECKPOINT: About to make POST /videos API call to Sora v1', {
          internalJobId,
          soraV1Request,
        });

        const apiCallStartTime = Date.now();
        const response = await this.client.post<SoraV1JobResponse>('/videos', soraV1Request, {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        });
        const apiCallDuration = Date.now() - apiCallStartTime;

        logger.info('🟢 CHECKPOINT: Sora v1 API call completed successfully', {
          internalJobId,
          httpStatus: response.status,
          apiCallDuration,
        });

        // Log response received
        logger.info(
          {
            internalJobId,
            httpStatus: response.status,
            httpStatusText: response.statusText,
            apiCallDuration,
            soraJobId: response.data.id,
            soraJobStatus: response.data.status,
          },
          '[SoraV1Client] Received response from Sora v1 API',
        );

        // Log detailed response data
        logger.debug(
          {
            internalJobId,
            responseData: {
              object: response.data.object,
              id: response.data.id,
              status: response.data.status,
              created_at: response.data.created_at,
              model: response.data.model,
              n_seconds: response.data.n_seconds,
              width: response.data.width,
              height: response.data.height,
              n_variants: response.data.n_variants,
              generationsCount: response.data.generations.length,
            },
          },
          '[SoraV1Client] Detailed Sora v1 response data',
        );

        const duration = Date.now() - startTime;

        // Map Sora v1 response to generic format
        logger.debug({ internalJobId }, '[SoraV1Client] Mapping Sora v1 response to generic format');
        const genericResponse = this.mapSoraV1ToGeneric(response.data);
        logger.debug(
          {
            internalJobId,
            genericResponse: {
              id: genericResponse.id,
              status: genericResponse.status,
              model: genericResponse.model,
              size: genericResponse.size,
              seconds: genericResponse.seconds,
            },
          },
          '[SoraV1Client] Mapped response to generic format',
        );

        // Log the response from Sora (file logging)
        if (internalJobId) {
          try {
            await appendSoraResponse(internalJobId, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers as Record<string, string>,
              body: response.data,
              duration: apiCallDuration,
            });
            logger.debug({ internalJobId }, '[SoraV1Client] Logged response to file');
          } catch (logError) {
            logger.warn({ internalJobId, error: logError }, '[SoraV1Client] Failed to log Sora v1 response to file');
          }
        }

        logger.info(
          {
            jobId: response.data.id,
            status: response.data.status,
            idempotencyKey,
            internalJobId,
            totalDuration: duration,
            apiCallDuration,
          },
          '[SoraV1Client] Video creation job initiated successfully',
        );

        return genericResponse;
      } catch (error) {
        logger.error('🔴 CHECKPOINT: Error caught in SoraV1Client.createVideo()', {
          internalJobId,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        // Log error details
        logger.error(
          {
            internalJobId,
            error,
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
            isAxiosError: axios.isAxiosError(error),
            httpStatus: axios.isAxiosError(error) ? error.response?.status : undefined,
            httpData: axios.isAxiosError(error) ? error.response?.data : undefined,
          },
          '[SoraV1Client] Error during Sora v1 API call',
        );

        // Log error to file
        if (internalJobId) {
          try {
            await appendSoraError(internalJobId, error);
            logger.debug({ internalJobId }, '[SoraV1Client] Logged error to file');
          } catch (logError) {
            logger.warn({ internalJobId, error: logError }, '[SoraV1Client] Failed to log Sora v1 error to file');
          }
        }
        throw error;
      }
    }, 'createVideo');
  }

  /**
   * Get video generation job status
   * GET /v1/videos/{id}
   */
  async getVideoStatus(jobId: string): Promise<SoraJobResponse> {
    logger.info('🟢 CHECKPOINT: SoraV1Client.getVideoStatus() method called', { jobId });
    logger.info({ jobId }, '[SoraV1Client] Getting video status from Sora v1 API');

    return this.retryWithBackoff(async () => {
      logger.info('🟡 CHECKPOINT: About to make GET /videos/{id} API call to Sora v1', { jobId });
      logger.debug(
        {
          jobId,
          url: `${this.client.defaults.baseURL}/videos/${jobId}`,
          method: 'GET',
        },
        '[SoraV1Client] Sending GET request to Sora v1 API for status',
      );

      const apiCallStartTime = Date.now();
      const response = await this.client.get<SoraV1JobResponse>(`/videos/${jobId}`);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info('🟢 CHECKPOINT: GET /videos/{id} API call completed', {
        jobId,
        httpStatus: response.status,
        apiCallDuration,
      });

      logger.info(
        {
          jobId,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          apiCallDuration,
          soraJobStatus: response.data.status,
          hasGenerations: response.data.generations.length > 0,
          generationsCount: response.data.generations.length,
        },
        '[SoraV1Client] Received status response from Sora v1 API',
      );

      logger.debug(
        {
          jobId,
          statusDetails: {
            object: response.data.object,
            id: response.data.id,
            status: response.data.status,
            created_at: response.data.created_at,
            finished_at: response.data.finished_at,
            expires_at: response.data.expires_at,
            model: response.data.model,
            n_seconds: response.data.n_seconds,
            width: response.data.width,
            height: response.data.height,
            failure_reason: response.data.failure_reason,
          },
        },
        '[SoraV1Client] Detailed status response from Sora v1',
      );

      // Map Sora v1 response to generic format
      logger.debug({ jobId }, '[SoraV1Client] Mapping Sora v1 status response to generic format');
      const genericResponse = this.mapSoraV1ToGeneric(response.data);

      logger.debug(
        {
          jobId,
          mappedStatus: genericResponse.status,
          mappedSize: genericResponse.size,
          mappedSeconds: genericResponse.seconds,
        },
        '[SoraV1Client] Completed mapping status response to generic format',
      );

      return genericResponse;
    }, 'getVideoStatus');
  }

  /**
   * Cancel a video generation job
   * DELETE /v1/videos/{id}
   */
  async cancelVideo(jobId: string): Promise<void> {
    logger.info('🟢 CHECKPOINT: SoraV1Client.cancelVideo() method called', { jobId });
    logger.info({ jobId }, '[SoraV1Client] Cancelling video via Sora v1 API');

    return this.retryWithBackoff(async () => {
      logger.info('🟡 CHECKPOINT: About to make DELETE /videos/{id} API call to Sora v1', { jobId });
      logger.debug(
        {
          jobId,
          url: `${this.client.defaults.baseURL}/videos/${jobId}`,
          method: 'DELETE',
        },
        '[SoraV1Client] Sending DELETE request to Sora v1 API',
      );

      const apiCallStartTime = Date.now();
      const response = await this.client.delete(`/videos/${jobId}`);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info('🟢 CHECKPOINT: DELETE /videos/{id} API call completed', {
        jobId,
        httpStatus: response.status,
        apiCallDuration,
      });

      logger.info(
        {
          jobId,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          apiCallDuration,
        },
        '[SoraV1Client] Video cancellation completed via Sora v1',
      );
    }, 'cancelVideo');
  }

  /**
   * Download video content
   * GET /v1/videos/{id}/content
   * Returns binary video file (MP4)
   */
  async downloadVideo(jobId: string): Promise<Buffer> {
    logger.info('🟢 CHECKPOINT: SoraV1Client.downloadVideo() method called', { jobId });
    logger.info({ jobId }, '[SoraV1Client] Starting video download from Sora v1 API');

    return this.retryWithBackoff(async () => {
      logger.info('🟡 CHECKPOINT: About to make GET /videos/{id}/content API call to Sora v1', { jobId });
      logger.debug(
        {
          jobId,
          url: `${this.client.defaults.baseURL}/videos/${jobId}/content`,
          method: 'GET',
          responseType: 'arraybuffer',
        },
        '[SoraV1Client] Sending GET request to download video content',
      );

      const apiCallStartTime = Date.now();
      const response = await this.client.get(`/videos/${jobId}/content`, {
        responseType: 'arraybuffer',
      });
      const apiCallDuration = Date.now() - apiCallStartTime;

      const buffer = Buffer.from(response.data);

      logger.info('🟢 CHECKPOINT: GET /videos/{id}/content API call completed', {
        jobId,
        httpStatus: response.status,
        sizeBytes: buffer.length,
        apiCallDuration,
      });

      logger.info(
        {
          jobId,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          contentType: response.headers['content-type'],
          sizeBytes: buffer.length,
          sizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
          apiCallDuration,
        },
        '[SoraV1Client] Video download completed from Sora v1',
      );

      return buffer;
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
      logger.warn({ error }, 'Sora v1 API health check failed (endpoint may not exist)');
      return false;
    }
  }
}
