/**
 * Health check controller
 */
import { FastifyReply, FastifyRequest } from 'fastify';
import { HealthService } from '../services/HealthService.js';

export class HealthController {
  constructor(private healthService: HealthService) {}

  /**
   * GET /health - Basic health check
   */
  async getHealth(_request: FastifyRequest, reply: FastifyReply) {
    const health = await this.healthService.getHealth();
    return reply.status(200).send(health);
  }

  /**
   * GET /ready - Readiness probe
   */
  async getReadiness(_request: FastifyRequest, reply: FastifyReply) {
    const readiness = await this.healthService.getReadiness();
    const statusCode = readiness.ready ? 200 : 503;
    return reply.status(statusCode).send(readiness);
  }

  /**
   * GET /metrics - Application metrics
   */
  async getMetrics(_request: FastifyRequest, reply: FastifyReply) {
    const metrics = await this.healthService.getMetrics();
    return reply.status(200).send(metrics);
  }
}
