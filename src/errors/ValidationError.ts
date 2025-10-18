/**
 * Validation error for invalid request data
 */
import { AppError } from './AppError.js';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: ValidationErrorDetail[]) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }

  static fromFieldErrors(errors: ValidationErrorDetail[]): ValidationError {
    const message = `Validation failed: ${errors.map((e) => e.field).join(', ')}`;
    return new ValidationError(message, errors);
  }
}
