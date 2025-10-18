/**
 * Not found error for missing resources
 */
import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', true);
  }
}
