// User Roles
const ROLES = {
  ADMIN: 'director',
  MANAGER: 'manager',
  SALES_AGENT: 'sales_agent',
};

// Order Status
const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Inventory Status
const INVENTORY_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  DUPLICATE_ENTRY: 'This entry already exists',
  SERVER_ERROR: 'Internal server error',
};

module.exports = {
  ROLES,
  ORDER_STATUS,
  INVENTORY_STATUS,
  HTTP_STATUS,
  ERROR_MESSAGES,
};
