/**
 * Sora API-related type definitions
 */

/**
 * Sora video request parameters
 */
export interface SoraVideoRequest {
  prompt: string;
  duration?: number; // Duration in seconds (5-60)
  resolution?: '480p' | '720p' | '1080p' | '4k';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  style?: string;
  seed?: number;
}

/**
 * Sora batch request
 */
export interface SoraBatchRequest {
  videos: SoraVideoRequest[];
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Sora API response status
 */
export type SoraJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Sora API video result
 */
export interface SoraVideoResult {
  url: string;
  thumbnailUrl?: string;
  duration: number;
  resolution: string;
  fileSize?: number;
  format?: string;
}

/**
 * Sora API job response
 */
export interface SoraJobResponse {
  id: string;
  status: SoraJobStatus;
  prompt: string;
  result?: SoraVideoResult;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Sora API create response
 */
export interface SoraCreateResponse {
  id: string;
  status: SoraJobStatus;
  message: string;
}

/**
 * Sora API error response
 */
export interface SoraErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Type guard to check if response is an error
 */
export function isSoraError(response: unknown): response is SoraErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as SoraErrorResponse).error === 'object'
  );
}
