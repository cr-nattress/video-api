/**
 * Authentication middleware
 * Validates API key from request headers
 */
import { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../errors/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * API key authentication middleware
 */
export async function authenticate(request: FastifyRequest) {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  // Check if API key is provided
  if (!apiKey) {
    logger.warn(
      {
        requestId: request.id,
        ip: request.ip,
      },
      'Missing API key in request',
    );
    throw new UnauthorizedError('API key is required');
  }

  // Validate API key
  if (apiKey !== config.security.apiKey) {
    logger.warn(
      {
        requestId: request.id,
        ip: request.ip,
      },
      'Invalid API key provided',
    );
    throw new UnauthorizedError('Invalid API key');
  }

  // API key is valid, continue
  logger.debug(
    {
      requestId: request.id,
    },
    'Authentication successful',
  );
}
