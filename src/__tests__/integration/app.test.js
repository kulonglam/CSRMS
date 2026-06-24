const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const { createQueryMock, whenQuery } = require('../helpers/mockDb');

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { on: jest.fn() },
}));

const db = require('../../config/database');

describe('Health & static assets', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET / serves login page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('CSRMS');
  });

  test('GET /pages/products.html serves frontend page', async () => {
    const res = await request(app).get('/pages/products.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Products');
  });
});

describe('Auth API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/login rejects empty body with 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '', password: '' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login returns 401 for unknown user', async () => {
    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM users WHERE username', () => ({ rows: [] })),
    ]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('POST /api/auth/login returns token for valid credentials', async () => {
    const hash = await bcrypt.hash('Agent@123', 10);
    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM users WHERE username', () => ({
        rows: [{
          id: 3,
          branch_id: 1,
          full_name: 'Test Agent',
          username: 'agent1',
          password_hash: hash,
          role: 'sales_agent',
          status: 'active',
        }],
      })),
      whenQuery('INSERT INTO audit_logs', () => ({ rows: [] })),
    ]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'agent1', password: 'Agent@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('sales_agent');
  });

  test('GET /api/auth/me requires authentication', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns user when token is valid', async () => {
    const token = jwt.sign(
      { userId: 3, role: 'sales_agent', jti: 'test-jti' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({
        rows: [{
          id: 3,
          branch_id: 1,
          full_name: 'Test Agent',
          username: 'agent1',
          role: 'sales_agent',
          status: 'active',
        }],
      })),
    ]));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('agent1');
  });
});

describe('Protected routes', () => {
  test('GET /api/branches requires authentication', async () => {
    const res = await request(app).get('/api/branches');
    expect(res.status).toBe(401);
  });

  test('POST /api/branches rejects sales_agent role', async () => {
    const token = jwt.sign(
      { userId: 3, role: 'sales_agent', jti: 'jti-2' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({
        rows: [{
          id: 3,
          branch_id: 1,
          full_name: 'Agent',
          username: 'agent1',
          role: 'sales_agent',
          status: 'active',
        }],
      })),
    ]));

    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Branch' });

    expect(res.status).toBe(403);
  });
});

describe('404 handling', () => {
  test('unknown API route returns 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
