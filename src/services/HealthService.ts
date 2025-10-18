/**
 * Health service for checking system health
 */
import { ISoraClient } from '../clients/index.js';
import { IJobRepository } from '../repositories/index.js';
import { logger } from '../utils/logger.js';

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: {
    [key: string]: 'healthy' | 'unhealthy';
  };
  timestamp: string;
}

/**
 * Readiness check result
 */
export interface ReadinessCheckResult {
  ready: boolean;
  checks: {
    repository: 'healthy' | 'unhealthy';
    soraClient: 'healthy' | 'unhealthy';
  };
  timestamp: string;
}

/**
 * Metrics result
 */
export interface MetricsResult {
  jobs: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    nodeVersion: string;
  };
  timestamp: string;
}

export class HealthService {
  private startTime: number = Date.now();

  constructor(
    private jobRepository: IJobRepository,
    private soraClient: ISoraClient,
  ) {}

  /**
   * Basic health check
   */
  async getHealth(): Promise<HealthCheckResult> {
    return {
      status: 'healthy',
      checks: {
        api: 'healthy',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness check with dependency health
   */
  async getReadiness(): Promise<ReadinessCheckResult> {
    const checks = {
      repository: await this.checkRepository(),
      soraClient: await this.checkSoraClient(),
    };

    const ready = Object.values(checks).every((status) => status === 'healthy');

    return {
      ready,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get application metrics
   */
  async getMetrics(): Promise<MetricsResult> {
    try {
      const jobCounts = await this.jobRepository.countByStatus();
      const total = await this.jobRepository.count();

      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      const usedMemory = memUsage.heapUsed + memUsage.external;

      return {
        jobs: {
          total,
          pending: jobCounts.pending,
          processing: jobCounts.processing,
          completed: jobCounts.completed,
          failed: jobCounts.failed,
          cancelled: jobCounts.cancelled,
        },
        system: {
          uptime: Date.now() - this.startTime,
          memory: {
            used: usedMemory,
            total: totalMemory,
            percentage: Math.round((usedMemory / totalMemory) * 100),
          },
          nodeVersion: process.version,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get metrics');
      throw error;
    }
  }

  /**
   * Check repository health
   */
  private async checkRepository(): Promise<'healthy' | 'unhealthy'> {
    try {
      await this.jobRepository.count();
      return 'healthy';
    } catch (error) {
      logger.error({ error }, 'Repository health check failed');
      return 'unhealthy';
    }
  }

  /**
   * Check Sora client health
   */
  private async checkSoraClient(): Promise<'healthy' | 'unhealthy'> {
    try {
      const isHealthy = await this.soraClient.healthCheck();
      return isHealthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      logger.error({ error }, 'Sora client health check failed');
      return 'unhealthy';
    }
  }
}
