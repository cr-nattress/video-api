/**
 * File logging utility for detailed request/response logging
 */
import { writeFile, appendFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const LOGS_DIR = join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Generate a timestamp for log files
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

/**
 * Generate a filename for the log
 */
function getLogFilename(prefix: string = 'request'): string {
  const timestamp = getTimestamp();
  return `${prefix}_${timestamp}.txt`;
}

/**
 * Write detailed log to a file
 */
export async function writeDetailedLog(
  logData: {
    type: string;
    timestamp: string;
    request?: unknown;
    response?: unknown;
    error?: unknown;
    metadata?: Record<string, unknown>;
  },
  filename?: string,
): Promise<string> {
  try {
    const logFilename = filename || getLogFilename(logData.type);
    const logPath = join(LOGS_DIR, logFilename);

    // Format the log content
    const logContent = formatLogContent(logData);

    // Write to file
    await writeFile(logPath, logContent, 'utf-8');

    return logPath;
  } catch (error) {
    console.error('Failed to write log file:', error);
    throw error;
  }
}

/**
 * Append to an existing log file
 */
export async function appendToLog(logPath: string, content: string): Promise<void> {
  try {
    await appendFile(logPath, `\n${content}`, 'utf-8');
  } catch (error) {
    console.error('Failed to append to log file:', error);
    throw error;
  }
}

/**
 * Format log content as readable text
 */
function formatLogContent(logData: {
  type: string;
  timestamp: string;
  request?: unknown;
  response?: unknown;
  error?: unknown;
  metadata?: Record<string, unknown>;
}): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`LOG TYPE: ${logData.type.toUpperCase()}`);
  lines.push(`TIMESTAMP: ${logData.timestamp}`);
  lines.push('='.repeat(80));
  lines.push('');

  // Metadata
  if (logData.metadata) {
    lines.push('--- METADATA ---');
    lines.push(JSON.stringify(logData.metadata, null, 2));
    lines.push('');
  }

  // Request
  if (logData.request) {
    lines.push('--- REQUEST ---');
    lines.push(JSON.stringify(logData.request, null, 2));
    lines.push('');
  }

  // Response
  if (logData.response) {
    lines.push('--- RESPONSE ---');
    lines.push(JSON.stringify(logData.response, null, 2));
    lines.push('');
  }

  // Error
  if (logData.error) {
    lines.push('--- ERROR ---');
    if (logData.error instanceof Error) {
      lines.push(`Message: ${logData.error.message}`);
      lines.push(`Stack: ${logData.error.stack}`);
    } else {
      lines.push(JSON.stringify(logData.error, null, 2));
    }
    lines.push('');
  }

  lines.push('='.repeat(80));
  lines.push('END OF LOG');
  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Get log file path for a job
 */
export function getLogFilePath(jobId: string): string {
  return join(LOGS_DIR, `video_${jobId}.txt`);
}

/**
 * Log video creation request
 */
export async function logVideoRequest(data: {
  requestId: string;
  prompt: string;
  jobId: string;
  request: unknown;
  response?: unknown;
  error?: unknown;
}): Promise<string> {
  const logData = {
    type: 'video_creation',
    timestamp: new Date().toISOString(),
    metadata: {
      requestId: data.requestId,
      jobId: data.jobId,
      prompt: data.prompt,
    },
    request: data.request,
    response: data.response,
    error: data.error,
  };

  return writeDetailedLog(logData, `video_${data.jobId}.txt`);
}

/**
 * Append Sora API request details to log file
 */
export async function appendSoraRequest(
  jobId: string,
  data: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body: unknown;
  },
): Promise<void> {
  const logPath = getLogFilePath(jobId);

  const lines: string[] = [];
  lines.push('');
  lines.push('');
  lines.push('################################################################################');
  lines.push(`SORA API REQUEST - ${new Date().toISOString()}`);
  lines.push('################################################################################');
  lines.push('');
  lines.push(`METHOD: ${data.method}`);
  lines.push(`URL: ${data.url}`);
  lines.push('');

  if (data.headers) {
    lines.push('--- REQUEST HEADERS ---');
    // Redact sensitive headers
    const safeHeaders = { ...data.headers };
    if (safeHeaders.Authorization) {
      safeHeaders.Authorization = safeHeaders.Authorization.substring(0, 20) + '...[REDACTED]';
    }
    lines.push(JSON.stringify(safeHeaders, null, 2));
    lines.push('');
  }

  lines.push('--- REQUEST BODY SENT TO SORA ---');
  lines.push(JSON.stringify(data.body, null, 2));
  lines.push('');

  await appendToLog(logPath, lines.join('\n'));
}

/**
 * Append Sora API response details to log file
 */
export async function appendSoraResponse(
  jobId: string,
  data: {
    status: number;
    statusText: string;
    headers?: Record<string, string>;
    body: unknown;
    duration: number;
  },
): Promise<void> {
  const logPath = getLogFilePath(jobId);

  const lines: string[] = [];
  lines.push('');
  lines.push('--- SORA API RESPONSE ---');
  lines.push(`STATUS: ${data.status} ${data.statusText}`);
  lines.push(`DURATION: ${data.duration}ms`);
  lines.push('');

  if (data.headers) {
    lines.push('--- RESPONSE HEADERS ---');
    lines.push(JSON.stringify(data.headers, null, 2));
    lines.push('');
  }

  lines.push('--- RESPONSE BODY FROM SORA ---');
  lines.push(JSON.stringify(data.body, null, 2));
  lines.push('');
  lines.push('################################################################################');

  await appendToLog(logPath, lines.join('\n'));
}

/**
 * Append Sora API error details to log file
 */
export async function appendSoraError(
  jobId: string,
  error: unknown,
): Promise<void> {
  const logPath = getLogFilePath(jobId);

  const lines: string[] = [];
  lines.push('');
  lines.push('--- SORA API ERROR ---');

  if (error instanceof Error) {
    lines.push(`Message: ${error.message}`);
    lines.push(`Stack: ${error.stack}`);
  } else {
    lines.push(JSON.stringify(error, null, 2));
  }

  lines.push('');
  lines.push('################################################################################');

  await appendToLog(logPath, lines.join('\n'));
}
