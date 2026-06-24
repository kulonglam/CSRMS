jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: { on: jest.fn() },
}));

const request = require('supertest');
const app = require('../../app');
const db = require('../../config/database');
const {
  createQueryMock,
  createMockClient,
  whenQuery,
  authHeaders,
  mockAuthMiddleware,
} = require('../helpers/mockDb');

describe('Sales API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/sales rejects invalid payload with 422', async () => {
    const { headers, userRow } = mockAuthMiddleware(3, 'sales_agent');
    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({ rows: [userRow] })),
    ]));

    const res = await request(app)
      .post('/api/sales')
      .set(headers)
      .send({ items: [], amount_paid: 0 });

    expect(res.status).toBe(422);
  });

  test('POST /api/sales rejects insufficient payment', async () => {
    const { headers, userRow } = mockAuthMiddleware(3, 'sales_agent');
    const client = createMockClient([
      whenQuery('BEGIN', () => ({ rows: [] })),
      whenQuery('FOR UPDATE', () => ({
        rows: [{
          quantity_available: 10,
          selling_price: 5000,
          product_name: 'Test Product',
          status: 'active',
        }],
      })),
      whenQuery('ROLLBACK', () => ({ rows: [] })),
    ]);

    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({ rows: [userRow] })),
    ]));
    db.getClient.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/sales')
      .set(headers)
      .send({ items: [{ product_id: 1, quantity: 1 }], amount_paid: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/less than total/i);
    expect(client.release).toHaveBeenCalled();
  });

  test('POST /api/sales completes sale and returns receipt', async () => {
    const { headers, userRow } = mockAuthMiddleware(3, 'sales_agent');
    const client = createMockClient([
      whenQuery('BEGIN', () => ({ rows: [] })),
      whenQuery('FOR UPDATE', () => ({
        rows: [{
          quantity_available: 10,
          selling_price: 5000,
          product_name: 'Test Product',
          status: 'active',
        }],
      })),
      whenQuery('INSERT INTO sales', () => ({
        rows: [{
          id: 99,
          branch_id: 1,
          sales_agent_id: 3,
          total_amount: 5000,
          amount_paid: 6000,
          receipt_number: 'RCP-TEST',
          sale_date: '2026-06-14',
          status: 'completed',
        }],
      })),
      whenQuery('INSERT INTO sale_items', () => ({ rows: [] })),
      whenQuery('UPDATE inventory SET', () => ({ rows: [{ quantity_available: 9 }] })),
      whenQuery('COMMIT', () => ({ rows: [] })),
    ]);

    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({ rows: [userRow] })),
      whenQuery('FROM products WHERE id', () => ({ rows: [{ id: 1, name: 'Test Product', reorder_level: 5 }] })),
      whenQuery('FROM notifications', () => ({ rows: [] })),
      whenQuery('INSERT INTO notifications', () => ({ rows: [] })),
      whenQuery('INSERT INTO audit_logs', () => ({ rows: [] })),
      whenQuery('FROM sales s', () => ({
        rows: [{
          id: 99,
          receipt_number: 'RCP-TEST',
          total_amount: 5000,
          amount_paid: 6000,
          sales_agent_name: 'Test User',
          branch_name: 'Main Branch',
        }],
      })),
      whenQuery('FROM sale_items si', () => ({
        rows: [{ product_id: 1, quantity: 1, unit_price: 5000, product_name: 'Test Product' }],
      })),
    ]));
    db.getClient.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/sales')
      .set(headers)
      .send({ items: [{ product_id: 1, quantity: 1 }], amount_paid: 6000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receipt_number).toBe('RCP-TEST');
    expect(res.body.data.items).toHaveLength(1);
  });

  test('GET /api/sales returns list for authenticated agent', async () => {
    const { headers, userRow } = mockAuthMiddleware(3, 'sales_agent');
    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({ rows: [userRow] })),
      whenQuery('FROM sales s', () => ({
        rows: [{ id: 1, receipt_number: 'RCP-1', total_amount: 5000, status: 'completed' }],
      })),
    ]));

    const res = await request(app).get('/api/sales').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('Inventory API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/inventory requires authentication', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });

  test('GET /api/inventory returns branch inventory for manager', async () => {
    const { headers, userRow } = mockAuthMiddleware(2, 'manager');
    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({ rows: [userRow] })),
      whenQuery('FROM inventory i', () => ({
        rows: [{
          id: 1,
          product_id: 1,
          product_name: 'Rice',
          quantity_available: 20,
          stock_status: 'in_stock',
          branch_id: 1,
        }],
      })),
    ]));

    const res = await request(app).get('/api/inventory').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data[0].product_name).toBe('Rice');
  });

  test('POST /api/inventory/adjust rejects negative stock result', async () => {
    const { headers, userRow } = mockAuthMiddleware(2, 'manager');
    const client = createMockClient([
      whenQuery('BEGIN', () => ({ rows: [] })),
      whenQuery('FROM inventory WHERE product_id', () => ({
        rows: [{ quantity_available: 5, product_id: 1, branch_id: 1 }],
      })),
      whenQuery('ROLLBACK', () => ({ rows: [] })),
    ]);

    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({ rows: [userRow] })),
    ]));
    db.getClient.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/inventory/adjust')
      .set(headers)
      .send({ product_id: 1, quantity: -10, reason: 'Damage' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/negative stock/i);
  });

  test('POST /api/inventory/adjust records stock change', async () => {
    const { headers, userRow } = mockAuthMiddleware(2, 'manager');
    const client = createMockClient([
      whenQuery('BEGIN', () => ({ rows: [] })),
      whenQuery('FROM inventory WHERE product_id', () => ({
        rows: [{ id: 10, quantity_available: 5, product_id: 1, branch_id: 1 }],
      })),
      whenQuery('UPDATE inventory SET', () => ({
        rows: [{ id: 10, quantity_available: 8, product_id: 1, branch_id: 1 }],
      })),
      whenQuery('INSERT INTO stock_adjustments', () => ({
        rows: [{ id: 1, quantity: 3, reason: 'Restock' }],
      })),
      whenQuery('COMMIT', () => ({ rows: [] })),
    ]);

    db.query.mockImplementation(createQueryMock([
      whenQuery('FROM revoked_tokens', () => ({ rows: [] })),
      whenQuery('FROM users WHERE id', () => ({ rows: [userRow] })),
      whenQuery('INSERT INTO audit_logs', () => ({ rows: [] })),
      whenQuery('FROM products WHERE id', () => ({ rows: [{ id: 1, name: 'Rice', reorder_level: 5 }] })),
      whenQuery('FROM notifications', () => ({ rows: [] })),
    ]));
    db.getClient.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/inventory/adjust')
      .set(headers)
      .send({ product_id: 1, quantity: 3, reason: 'Restock' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inventory.quantity_available).toBe(8);
  });
});
