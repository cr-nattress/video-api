/**
 * Enhanced logger utility using Pino
 * Provides structured logging with context and performance tracking
 */
import pinoModule from 'pino';
import { config, isDevelopment } from '../config/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pino = (pinoModule as any).default || pinoModule;

/**
 * Create logger instance with configuration
 */
const loggerOptions: pinoModule.LoggerOptions = {
  level: config.logging.level,
  transport:
    isDevelopment() && config.logging.pretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            messageFormat: '{levelLabel} - {msg}',
          },
        }
      : undefined,
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: pinoModule.Bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      node_version: process.version,
    }),
  },
  timestamp: pinoModule.stdTimeFunctions.isoTime,
  serializers: {
    err: pinoModule.stdSerializers.err,
    req: pinoModule.stdSerializers.req,
    res: pinoModule.stdSerializers.res,
  },
};

export const logger: pinoModule.Logger = pino(loggerOptions);

/**
 * Create child logger with context
 */
export function createLogger(context: string, metadata?: Record<string, unknown>) {
  return logger.child({ context, ...metadata });
}

/**
 * Log performance timing
 */
export function logPerformance(operation: string, startTime: number) {
  const duration = Date.now() - startTime;
  logger.info({ operation, duration }, `${operation} completed in ${duration}ms`);
}

/**
 * Create a performance logger wrapper
 */
export function withPerformanceLogging<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn()
    .then((result) => {
      logPerformance(operation, start);
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - start;
      logger.error({ operation, duration, error }, `${operation} failed after ${duration}ms`);
      throw error;
    });
}

export default logger;
