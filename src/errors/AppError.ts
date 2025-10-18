/**
 * Base application error class
 * All custom errors extend from this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    isOperational: boolean = true,
    details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    const result: { code: string; message: string; details?: unknown } = {
      code: this.code,
      message: this.message,
    };
    if (this.details) {
      result.details = this.details;
    }
    return result;
  }
}
