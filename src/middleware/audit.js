const { query } = require('../config/database');

const auditLog = async ({ userId, action, tableName, recordId, oldValues, newValues, ipAddress }) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        action,
        tableName || null,
        recordId || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
      ]
    );
  } catch (err) {
    // Non-blocking: log to console but don't throw
    console.error('Audit log error:', err.message);
  }
};

module.exports = { auditLog };