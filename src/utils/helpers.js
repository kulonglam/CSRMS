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
 * Format currency to 2 decimal places
 */
const formatCurrency = (value) => parseFloat(value).toFixed(2);

/**
 * Get today's date as YYYY-MM-DD string
 */
const today = () => new Date().toISOString().split('T')[0];

module.exports = { generateReceiptNumber, formatCurrency, today };