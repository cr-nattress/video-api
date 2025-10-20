/**
 * Sora v1 API type definitions
 * Model: sora-1-turbo
 * Base URL: https://api.openai.com/v1
 */

/**
 * Sora v1 video request parameters
 */
export interface SoraVideoRequest {
  model?: 'sora-1-turbo'; // Optional: defaults to sora-1-turbo (only valid value)
  prompt: string; // Required: natural language description
  n_seconds?: number; // Optional: duration in seconds (1-20, default ~5)
  width?: number; // Optional: video width in pixels
  height?: number; // Optional: video height in pixels
  n_variants?: number; // Optional: number of variants (1-4, default 1)
  idempotencyKey?: string; // Optional: idempotency key for safe retries (auto-generated if not provided)
  // Legacy fields for backward compatibility (will be mapped to n_seconds/width/height)
  duration?: number; // Legacy: maps to n_seconds (1-20 seconds)
  resolution?: '480p' | '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  // Advanced fields (optional)
  style?: string;
  seed?: number;
}

/**
 * Sora batch request (multiple videos)
 */
export interface SoraBatchRequest {
  videos: SoraVideoRequest[];
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Sora v1 API job status
 * Matches OpenAI's video generation job statuses
 */
export type SoraJobStatus =
  | 'queued' // Waiting to start processing
  | 'in_progress' // Currently generating video
  | 'completed' // Successfully finished
  | 'failed' // Generation failed
  | 'cancelled'; // Job was cancelled

/**
 * Sora v1 API generation object
 * Represents a single generated video variant
 */
export interface SoraGeneration {
  id: string; // Generation ID
  video_url: string; // URL to download video (or relative path)
}

/**
 * Sora v1 API job response
 * Full job object returned by GET /v1/videos/{id}
 */
export interface SoraJobResponse {
  object: 'video.generation.job';
  id: string; // Job ID (e.g., "task_01GYHPM...")
  status: SoraJobStatus; // Current status
  created_at: number; // Unix timestamp
  finished_at: number | null; // Unix timestamp (when completed)
  expires_at: number | null; // Unix timestamp (video expiration)
  generations: SoraGeneration[]; // Array of generated videos
  prompt: string; // Original prompt
  model: string; // Model used ("sora-1-turbo")
  n_variants: number; // Number of variants requested
  n_seconds: number; // Duration in seconds
  height: number; // Video height
  width: number; // Video width
  failure_reason: string | null; // Error message (if failed)
}

/**
 * Sora v1 API create response
 * Response from POST /v1/videos
 * Same structure as SoraJobResponse but initially empty generations
 */
export type SoraCreateResponse = SoraJobResponse;

/**
 * Sora video result (legacy, for backward compatibility)
 * Maps to Job.result in our internal system
 */
export interface SoraVideoResult {
  url: string; // Video URL
  thumbnailUrl?: string; // Thumbnail URL (if available)
  duration: number; // Duration in seconds
  resolution: string; // Resolution (e.g., "1080p", "1920x1080")
  fileSize?: number; // File size in bytes
  format?: string; // Video format (e.g., "mp4")
}

/**
 * Sora API error response
 */
export interface SoraErrorResponse {
  error: {
    message: string;
    type: string; // e.g., "content_policy_violation", "invalid_request_error"
    code: string; // e.g., "content_filtered", "invalid_parameter"
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

/**
 * Supported resolutions for Sora v1
 */
export const SORA_V1_RESOLUTIONS = {
  '1920x1080': { width: 1920, height: 1080, aspectRatio: '16:9', label: 'Full HD Landscape' },
  '1080x1920': { width: 1080, height: 1920, aspectRatio: '9:16', label: 'Full HD Portrait' },
  '1280x720': { width: 1280, height: 720, aspectRatio: '16:9', label: 'HD Landscape' },
  '720x1280': { width: 720, height: 1280, aspectRatio: '9:16', label: 'HD Portrait' },
  '1080x1080': { width: 1080, height: 1080, aspectRatio: '1:1', label: 'Square' },
} as const;

/**
 * Map resolution string to width/height
 */
export function mapResolutionToSize(
  resolution?: '480p' | '720p' | '1080p'
): { width: number; height: number } {
  switch (resolution) {
    case '1080p':
      return { width: 1920, height: 1080 };
    case '720p':
      return { width: 1280, height: 720 };
    case '480p':
      return { width: 854, height: 480 };
    default:
      return { width: 1080, height: 1080 }; // Default to square
  }
}

/**
 * Map aspect ratio to width/height (landscape, assuming 1080p base)
 */
export function mapAspectRatioToSize(
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3'
): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '4:3':
      return { width: 1440, height: 1080 };
    default:
      return { width: 1920, height: 1080 }; // Default to 16:9 landscape
  }
}
