/**
 * Health endpoint integration tests
 */
import { buildApp } from '../../../src/app.js';

describe('Health endpoint', () => {
  it('should return 200 and health status', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.checks).toBeDefined();
    expect(body.timestamp).toBeDefined();

    await app.close();
  });
});
