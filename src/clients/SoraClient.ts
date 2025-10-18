/**
 * Sora API client implementation with retry logic
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
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

export class SoraClient implements ISoraClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private baseDelay: number = 1000; // 1 second

  constructor() {
    this.maxRetries = config.openai.maxRetries;
    this.client = axios.create({
      baseURL: config.openai.soraBaseUrl,
      timeout: config.openai.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openai.apiKey}`,
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
      // Retry on network errors or 5xx server errors
      return !status || status >= 500;
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
   * Create a new video generation job
   */
  async createVideo(request: SoraVideoRequest): Promise<SoraCreateResponse> {
    return this.retryWithBackoff(async () => {
      logger.info({ prompt: request.prompt }, 'Creating video via Sora API');

      const response = await this.client.post<SoraCreateResponse>('/videos', request);

      logger.info(
        {
          jobId: response.data.id,
          status: response.data.status,
        },
        'Video creation job initiated',
      );

      return response.data;
    }, 'createVideo');
  }

  /**
   * Get video generation job status
   */
  async getVideoStatus(jobId: string): Promise<SoraJobResponse> {
    return this.retryWithBackoff(async () => {
      logger.debug({ jobId }, 'Fetching video status from Sora API');

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
   */
  async cancelVideo(jobId: string): Promise<void> {
    return this.retryWithBackoff(async () => {
      logger.info({ jobId }, 'Cancelling video via Sora API');

      await this.client.delete(`/videos/${jobId}`);

      logger.info({ jobId }, 'Video cancellation requested');
    }, 'cancelVideo');
  }

  /**
   * Health check for Sora API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      logger.warn({ error }, 'Sora API health check failed');
      return false;
    }
  }
}
