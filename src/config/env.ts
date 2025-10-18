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
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Validate and return required environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value || String(defaultValue), 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
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
