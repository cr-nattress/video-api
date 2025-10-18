/**
 * Rate limit error for too many requests
 */
import { AppError } from './AppError.js';

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, { retryAfter });
  }
}
