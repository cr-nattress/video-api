/**
 * Video request/response DTOs
 */

/**
 * Create video request DTO
 */
export interface CreateVideoRequest {
  prompt: string;
  duration?: number;
  resolution?: '480p' | '720p' | '1080p' | '4k';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  style?: string;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Video response DTO
 */
export interface VideoResponse {
  jobId: string;
  status: string;
  message: string;
}

/**
 * Video result response DTO
 */
export interface VideoResultResponse {
  id: string;
  prompt: string;
  status: string;
  priority: string;
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
    resolution: string;
    fileSize?: number;
    format?: string;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}
