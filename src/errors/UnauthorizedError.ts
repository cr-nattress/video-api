/**
 * Unauthorized error for authentication failures
 */
import { AppError } from './AppError.js';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}
