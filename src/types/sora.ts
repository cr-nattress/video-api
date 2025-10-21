/**
 * Sora 2 API type definitions
 * Models: sora-2, sora-2-pro
 * Base URL: https://api.openai.com/v1
 */

/**
 * Sora 2 video request parameters
 */
export interface SoraVideoRequest {
  model?: 'sora-2' | 'sora-2-pro'; // Optional: defaults to sora-2
  prompt: string; // Required: natural language description
  size?: string; // Optional: resolution as "WIDTHxHEIGHT" (e.g., "1280x720")
  seconds?: '4' | '8' | '12'; // Optional: duration in seconds (default: "4")
  idempotencyKey?: string; // Optional: idempotency key for safe retries (auto-generated if not provided)
  // Legacy fields for backward compatibility (will be mapped to size/seconds)
  duration?: number; // Legacy: maps to seconds
  resolution?: '480p' | '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  width?: number; // Legacy: will be combined with height to create size
  height?: number; // Legacy: will be combined with width to create size
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
 * Sora 2 API job status
 * Matches OpenAI's video generation job statuses
 */
export type SoraJobStatus =
  | 'queued' // Waiting to start processing
  | 'in_progress' // Currently generating video
  | 'completed' // Successfully finished
  | 'failed' // Generation failed
  | 'cancelled'; // Job was cancelled

/**
 * Sora 2 API generation object
 * Represents a single generated video variant
 */
export interface SoraGeneration {
  id: string; // Generation ID
  video_url: string; // URL to download video (or relative path)
}

/**
 * Sora 2 API job response
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
  model: string; // Model used ("sora-2" or "sora-2-pro")
  size: string; // Resolution as "WIDTHxHEIGHT" (e.g., "1280x720")
  seconds: string; // Duration in seconds ("4", "8", or "12")
  failure_reason: string | null; // Error message (if failed)
}

/**
 * Sora 2 API create response
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
 * Supported resolutions for Sora 2
 */
export const SORA_2_RESOLUTIONS = {
  // sora-2 resolutions
  '1280x720': { width: 1280, height: 720, aspectRatio: '16:9', label: 'HD Landscape', models: ['sora-2', 'sora-2-pro'] },
  '720x1280': { width: 720, height: 1280, aspectRatio: '9:16', label: 'HD Portrait', models: ['sora-2', 'sora-2-pro'] },
  // sora-2-pro additional resolutions
  '1024x1792': { width: 1024, height: 1792, aspectRatio: '9:16', label: 'Vertical Pro', models: ['sora-2-pro'] },
  '1792x1024': { width: 1792, height: 1024, aspectRatio: '16:9', label: 'Horizontal Pro', models: ['sora-2-pro'] },
} as const;

/**
 * Supported duration values for Sora 2
 */
export const SORA_2_DURATIONS = ['4', '8', '12'] as const;

/**
 * Map resolution string to Sora 2 size format (WIDTHxHEIGHT)
 */
export function mapResolutionToSoraSize(
  resolution?: '480p' | '720p' | '1080p'
): string {
  switch (resolution) {
    case '720p':
      return '1280x720'; // HD landscape
    case '1080p':
    case '480p':
    default:
      return '1280x720'; // Default to HD landscape (sora-2 doesn't support 1080p or 480p)
  }
}

/**
 * Map aspect ratio to Sora 2 size format (WIDTHxHEIGHT)
 */
export function mapAspectRatioToSoraSize(
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3'
): string {
  switch (aspectRatio) {
    case '16:9':
      return '1280x720'; // Landscape
    case '9:16':
      return '720x1280'; // Portrait
    case '1:1':
    case '4:3':
    default:
      return '1280x720'; // Default to landscape (sora-2 doesn't support square/4:3)
  }
}

/**
 * Map duration number to Sora 2 seconds format (string "4", "8", or "12")
 */
export function mapDurationToSeconds(duration?: number): '4' | '8' | '12' {
  if (!duration) return '4'; // Default

  if (duration <= 4) return '4';
  if (duration <= 8) return '8';
  return '12';
}
