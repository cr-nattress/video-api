# User Story: US-002 - Infrastructure & Logging Setup

## Story Description
**As a** developer
**I want** robust logging infrastructure and configuration management
**So that** I can monitor application behavior and manage settings effectively

## Acceptance Criteria
- [ ] Enhanced logger with multiple log levels and contexts
- [ ] Configuration loader with environment variable validation
- [ ] Typed configuration interface
- [ ] Request logging capability
- [ ] Error logging with stack traces
- [ ] Performance logging helpers
- [ ] Configuration singleton pattern

## Story Points
3

## Priority
Must Have (P0)

## Dependencies
- US-001 (Project Foundation)

## Technical Notes
- Use Pino for structured logging
- Validate all environment variables at startup
- Provide sensible defaults for optional configs
- Support both development and production modes

---

## Task Prompts

### Task 1: Create Configuration Types
```
Create src/config/env.ts with TypeScript interfaces for all configuration:

/**
 * Environment configuration type definitions
 */

export interface ServerConfig {
  nodeEnv: string;
  port: number;
  host: string;
}

export interface OpenAIConfig {
  apiKey: string;
  soraBaseUrl: string;
  timeout: number;
  maxRetries: number;
}

export interface SecurityConfig {
  apiKey: string;
  rateLimitMax: number;
  rateLimitWindow: number;
}

export interface LoggingConfig {
  level: string;
  pretty: boolean;
}

export interface AppConfig {
  server: ServerConfig;
  openai: OpenAIConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

/**
 * Validate and return required environment variable
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(\`Missing required environment variable: \${key}\`);
  }
  return value;
}

/**
 * Validate and return required environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(\`Missing required environment variable: \${key}\`);
  }
  const parsed = parseInt(value || String(defaultValue), 10);
  if (isNaN(parsed)) {
    throw new Error(\`Invalid number for environment variable \${key}: \${value}\`);
  }
  return parsed;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}
```

### Task 2: Create Configuration Loader
```
Create src/config/index.ts that loads and validates all configuration:

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
```

### Task 3: Enhance Logger Utility
```
Update src/utils/logger.ts with enhanced logging capabilities:

/**
 * Enhanced logger utility using Pino
 * Provides structured logging with context and performance tracking
 */
import pino from 'pino';
import { config, isDevelopment } from '../config/index.js';

/**
 * Create logger instance with configuration
 */
export const logger = pino({
  level: config.logging.level,
  transport: isDevelopment() && config.logging.pretty
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
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      node_version: process.version,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

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
  logger.info({ operation, duration }, \`\${operation} completed in \${duration}ms\`);
}

/**
 * Create a performance logger wrapper
 */
export function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return fn()
    .then((result) => {
      logPerformance(operation, start);
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - start;
      logger.error(
        { operation, duration, error },
        \`\${operation} failed after \${duration}ms\`
      );
      throw error;
    });
}

export default logger;
```

### Task 4: Update Server to Use Configuration
```
Update src/server.ts to use the new configuration system:

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
    logger.info({
      config: {
        port: config.server.port,
        host: config.server.host,
        nodeEnv: config.server.nodeEnv,
        logLevel: config.logging.level,
        openaiConfigured: !!config.openai.apiKey,
      },
    }, 'Starting server with configuration');

    const app = await buildApp();

    await app.listen({
      port: config.server.port,
      host: config.server.host
    });

    logger.info(
      \`Server running at http://\${config.server.host}:\${config.server.port}\`
    );
    logger.info(\`Environment: \${config.server.nodeEnv}\`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
async function shutdown(signal: string) {
  logger.info(\`\${signal} received, shutting down gracefully\`);
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
```

### Task 5: Create Configuration Tests
```
Create tests/unit/config/config.test.ts:

/**
 * Tests for configuration loader
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Configuration Loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should load configuration with default values', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.API_KEY = 'test-api-key';

    // Re-import to get fresh config
    jest.isolateModules(() => {
      const { config } = require('../../../src/config/index');

      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe('0.0.0.0');
      expect(config.openai.apiKey).toBe('test-key');
    });
  });

  it('should throw error for missing required variables', () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => {
      jest.isolateModules(() => {
        require('../../../src/config/index');
      });
    }).toThrow('Missing required environment variable: OPENAI_API_KEY');
  });

  it('should parse numeric environment variables', () => {
    process.env.PORT = '8080';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.API_KEY = 'test-api-key';

    jest.isolateModules(() => {
      const { config } = require('../../../src/config/index');
      expect(config.server.port).toBe(8080);
    });
  });

  it('should parse boolean environment variables', () => {
    process.env.LOG_PRETTY = 'false';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.API_KEY = 'test-api-key';

    jest.isolateModules(() => {
      const { config } = require('../../../src/config/index');
      expect(config.logging.pretty).toBe(false);
    });
  });
});
```

### Task 6: Create Logger Tests
```
Create tests/unit/utils/logger.test.ts:

/**
 * Tests for logger utility
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { logger, createLogger, withPerformanceLogging } from '../../../src/utils/logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    // Suppress logs during tests
    jest.spyOn(logger, 'info').mockImplementation(() => logger);
    jest.spyOn(logger, 'error').mockImplementation(() => logger);
  });

  it('should create child logger with context', () => {
    const childLogger = createLogger('TestContext', { userId: '123' });
    expect(childLogger).toBeDefined();
  });

  it('should log performance timing', async () => {
    const operation = 'test-operation';
    const fn = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'result';
    };

    const result = await withPerformanceLogging(operation, fn);

    expect(result).toBe('result');
    expect(logger.info).toHaveBeenCalled();
  });

  it('should log errors in performance tracking', async () => {
    const operation = 'failing-operation';
    const fn = async () => {
      throw new Error('Test error');
    };

    await expect(withPerformanceLogging(operation, fn)).rejects.toThrow('Test error');
    expect(logger.error).toHaveBeenCalled();
  });
});
```

### Task 7: Add JSDoc Comments
```
Ensure all functions in config and logger files have comprehensive JSDoc comments:
- Document parameters and return types
- Include usage examples where helpful
- Document thrown errors
- Add @example tags for complex functions
```

### Task 8: Update .env.example
```
Verify .env.example has all configuration variables with descriptions:

# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# ============================================
# OpenAI Sora Configuration
# ============================================
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_SORA_BASE_URL=https://api.openai.com/v1/sora
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3

# ============================================
# API Security
# ============================================
API_KEY=your-api-key-here
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=info
LOG_PRETTY=true
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All TypeScript files pass linting (npm run lint)
- [ ] All code formatted with Prettier
- [ ] No TypeScript errors (npm run type-check)
- [ ] All functions have JSDoc comments
- [ ] No hardcoded configuration values

### Testing
- [ ] Unit tests for configuration loader
- [ ] Unit tests for logger utilities
- [ ] Unit tests for environment variable validation
- [ ] All tests passing (npm test)
- [ ] Test coverage >= 70% for config and logger modules

### Functionality
- [ ] Configuration loads successfully from .env
- [ ] Required environment variables are validated
- [ ] Missing required variables throw clear errors
- [ ] Logger outputs structured JSON in production
- [ ] Logger uses pretty printing in development
- [ ] Child loggers work with context
- [ ] Performance logging captures duration
- [ ] Configuration singleton works correctly

### Documentation
- [ ] All public functions documented with JSDoc
- [ ] .env.example updated with all variables
- [ ] Create /docs/US-002-configuration-guide.md with:
  - Configuration structure explanation
  - Environment variable reference
  - Logger usage examples
  - Performance logging examples

### Integration
- [ ] Server starts with new configuration
- [ ] Server logs startup configuration (masked)
- [ ] Invalid configuration prevents server start
- [ ] Logger integrates with Fastify

---

## Verification Steps

1. **Test Configuration Loading**
   ```bash
   # Should start successfully
   npm run dev

   # Should see masked configuration in logs
   # Check for proper log format
   ```

2. **Test Missing Environment Variables**
   ```bash
   # Remove OPENAI_API_KEY from .env temporarily
   npm run dev
   # Should fail with clear error message
   ```

3. **Test Logger Levels**
   ```bash
   # Set LOG_LEVEL=debug in .env
   npm run dev
   # Should see debug logs

   # Set LOG_LEVEL=error
   # Should only see error logs
   ```

4. **Run Tests**
   ```bash
   npm test
   npm run test:coverage
   # Verify coverage for config and logger modules
   ```

---

## Notes for Developers
- Configuration is loaded once at startup - changes require restart
- Never log sensitive values (API keys, passwords)
- Use child loggers for component-specific logging
- Performance logging helps identify bottlenecks
- Configuration validation prevents runtime errors

## Related Documentation
- `/docs/US-002-configuration-guide.md` (to be created)
