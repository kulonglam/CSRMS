process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-csrms';
process.env.JWT_EXPIRE = '1h';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-jti-uuid') }));
