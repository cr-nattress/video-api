/**
 * Batch request/response DTOs
 */
import { CreateVideoRequest } from './video.dto.js';

/**
 * Batch video request DTO
 */
export interface BatchVideoRequest {
  name?: string;
  videos: CreateVideoRequest[];
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Batch response DTO
 */
export interface BatchResponse {
  batchId: string;
  jobIds: string[];
  total: number;
  message: string;
}

/**
 * Batch status response DTO
 */
export interface BatchStatusResponse {
  id: string;
  name?: string;
  status: string;
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
    cancelled: number;
    percentage: number;
  };
  jobIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
