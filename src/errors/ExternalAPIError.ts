/**
 * External API error for third-party service failures
 */
import { AppError } from './AppError.js';

export class ExternalAPIError extends AppError {
  constructor(
    service: string,
    message: string = 'External API error',
    statusCode: number = 502,
    details?: unknown,
  ) {
    super(`${service}: ${message}`, statusCode, 'EXTERNAL_API_ERROR', true, details);
  }
}
