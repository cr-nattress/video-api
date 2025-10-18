/**
 * Application configuration loader
 * Validates and provides typed access to all configuration values
 */
import { config as dotenvConfig } from 'dotenv';
import { AppConfig, getEnvVar, getEnvNumber, getEnvBoolean } from './env.js';

// Load environment variables
dotenvConfig();

/**
 * Load and validate all application configuration
 */
function loadConfig(): AppConfig {
  return {
    server: {
      nodeEnv: getEnvVar('NODE_ENV', 'development'),
      port: getEnvNumber('PORT', 3000),
      host: getEnvVar('HOST', '0.0.0.0'),
    },
    openai: {
      apiKey: getEnvVar('OPENAI_API_KEY'),
      soraBaseUrl: getEnvVar('OPENAI_SORA_BASE_URL', 'https://api.openai.com/v1/sora'),
      timeout: getEnvNumber('OPENAI_TIMEOUT', 30000),
      maxRetries: getEnvNumber('OPENAI_MAX_RETRIES', 3),
    },
    security: {
      apiKey: getEnvVar('API_KEY'),
      rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 100),
      rateLimitWindow: getEnvNumber('RATE_LIMIT_WINDOW', 60000),
    },
    logging: {
      level: getEnvVar('LOG_LEVEL', 'info'),
      pretty: getEnvBoolean('LOG_PRETTY', true),
    },
  };
}

/**
 * Singleton configuration instance
 */
export const config: AppConfig = loadConfig();

/**
 * Check if running in production
 */
export const isProduction = (): boolean => config.server.nodeEnv === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => config.server.nodeEnv === 'development';

/**
 * Check if running in test
 */
export const isTest = (): boolean => config.server.nodeEnv === 'test';
