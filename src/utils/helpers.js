const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique receipt number: RCP-YYYYMMDD-XXXX
 */
const generateReceiptNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = uuidv4().split('-')[0].toUpperCase();
  return `RCP-${date}-${suffix}`;
};

/**
 * Parse page/limit from query string for list endpoints.
 */
function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  let limit = parseInt(String(query.limit ?? defaultLimit), 10);
  if (Number.isNaN(limit) || limit < 1) limit = defaultLimit;
  limit = Math.min(maxLimit, limit);
  return { page, limit, offset: (page - 1) * limit };
}

function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { generateReceiptNumber, parsePagination, paginationMeta };
