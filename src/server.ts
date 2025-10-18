/**
 * Server entry point
 * Starts the Fastify server with validated configuration
 */
import { buildApp } from './app.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

/**
 * Start the server
 */
async function start() {
  try {
    // Log configuration (mask sensitive values)
    logger.info(
      {
        config: {
          port: config.server.port,
          host: config.server.host,
          nodeEnv: config.server.nodeEnv,
          logLevel: config.logging.level,
          openaiConfigured: !!config.openai.apiKey,
        },
      },
      'Starting server with configuration',
    );

    const app = await buildApp();

    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(`Server running at http://${config.server.host}:${config.server.port}`);
    logger.info(`Environment: ${config.server.nodeEnv}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  // TODO: Close database connections, cleanup resources
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

start();
