function createQueryMock(handlers = []) {
  return jest.fn((text, params) => {
    for (const handler of handlers) {
      const result = handler(text, params);
      if (result !== undefined) {
        return Promise.resolve(result);
      }
    }
    throw new Error(`Unexpected query: ${text}`);
  });
}

function createMockClient(handlers = []) {
  const query = createQueryMock(handlers);
  return { query, release: jest.fn() };
}

function matchQuery(text, pattern) {
  if (typeof pattern === 'string') return text.includes(pattern);
  return pattern.test(text);
}

function whenQuery(pattern, response) {
  return (text, params) => (matchQuery(text, pattern) ? response(params, text) : undefined);
}

function authHeaders(userId, role) {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId, role, jti: `test-jti-${userId}` },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { Authorization: `Bearer ${token}` };
}

function mockAuthMiddleware(userId, role, branchId = 1) {
  return {
    headers: authHeaders(userId, role),
    userRow: {
      id: userId,
      branch_id: branchId,
      full_name: 'Test User',
      username: 'testuser',
      role,
      status: 'active',
    },
  };
}

module.exports = {
  createQueryMock,
  createMockClient,
  whenQuery,
  matchQuery,
  authHeaders,
  mockAuthMiddleware,
};
