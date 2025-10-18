/**
 * Global error handler middleware for Fastify
 * Handles all errors and formats responses consistently
 */
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

/**
 * Error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

/**
 * Global error handler
 */
export function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Extract request ID if available
  const requestId = request.id;

  // Handle known AppError instances
  if (error instanceof AppError) {
    logger.warn(
      {
        err: error,
        requestId,
        statusCode: error.statusCode,
        code: error.code,
      },
      'Application error occurred',
    );

    const response: ErrorResponse = {
      success: false,
      error: error.toJSON(),
      requestId,
    };

    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify validation errors
  if ('validation' in error && error.validation) {
    logger.warn(
      {
        err: error,
        requestId,
        validation: error.validation,
      },
      'Validation error occurred',
    );

    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Validation failed',
        details: error.validation,
      },
      requestId,
    };

    return reply.status(400).send(response);
  }

  // Handle Fastify errors with statusCode
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const statusCode = error.statusCode;
    const isClientError = statusCode >= 400 && statusCode < 500;

    if (isClientError) {
      logger.warn(
        {
          err: error,
          requestId,
          statusCode,
        },
        'Client error occurred',
      );
    } else {
      logger.error(
        {
          err: error,
          requestId,
          statusCode,
        },
        'Server error occurred',
      );
    }

    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'An error occurred',
      },
      requestId,
    };

    return reply.status(statusCode).send(response);
  }

  // Handle unknown errors
  logger.error(
    {
      err: error,
      requestId,
      stack: error.stack,
    },
    'Unexpected error occurred',
  );

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
    requestId,
  };

  return reply.status(500).send(response);
}
