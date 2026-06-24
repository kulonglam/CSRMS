const request = require('supertest');
const app = require('../../app');

const SRS_RESPONSE_MS = 3000;

describe('Performance smoke (SRS §6)', () => {
  test('GET /health responds within 3 seconds', async () => {
    const start = Date.now();
    const res = await request(app).get('/health');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(SRS_RESPONSE_MS);
  });

  test('GET / serves login page within 3 seconds', async () => {
    const start = Date.now();
    const res = await request(app).get('/');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(SRS_RESPONSE_MS);
  });

  test('handles 20 sequential health checks within SRS response budget', async () => {
    for (let i = 0; i < 20; i += 1) {
      const start = Date.now();
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(Date.now() - start).toBeLessThan(SRS_RESPONSE_MS);
    }
  });
});
