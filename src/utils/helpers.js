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

module.exports = { generateReceiptNumber };
