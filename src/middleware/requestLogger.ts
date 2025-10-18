/**
 * Request logging middleware
 * Logs incoming requests and responses with timing information
 */
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { logger } from '../utils/logger.js';

/**
 * Request logging middleware
 */
export function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) {
  const start = Date.now();

  // Log incoming request
  logger.info(
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
    'Incoming request',
  );

  // Log response when done
  reply.raw.on('finish', () => {
    const duration = Date.now() - start;

    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
      },
      `Request completed in ${duration}ms`,
    );
  });

  done();
}
