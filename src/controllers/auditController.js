const { query } = require('../config/database');

function buildAuditFilters(req) {
  const { user_id, action, table_name, from_date, to_date } = req.query;

  let sql = ` FROM audit_logs al
              LEFT JOIN users u ON u.id = al.user_id
              WHERE 1=1`;
  const params = [];

  if (user_id) {
    params.push(user_id);
    sql += ` AND al.user_id = $${params.length}`;
  }
  if (action) {
    params.push(`%${action}%`);
    sql += ` AND al.action ILIKE $${params.length}`;
  }
  if (table_name) {
    params.push(table_name);
    sql += ` AND al.table_name = $${params.length}`;
  }
  if (from_date) {
    params.push(from_date);
    sql += ` AND al.created_at >= $${params.length}`;
  }
  if (to_date) {
    params.push(to_date);
    sql += ` AND al.created_at <= $${params.length}`;
  }

  if (req.user.role === 'sales_agent') {
    params.push(req.user.id);
    sql += ` AND al.user_id = $${params.length}`;
  }

  return { sql, params };
}

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// GET /api/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { sql, params } = buildAuditFilters(req);
    const result = await query(
      `SELECT al.*, u.full_name AS user_name, u.role AS user_role${sql}
       ORDER BY al.created_at DESC LIMIT 200`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/audit-logs/export
const exportAuditLogs = async (req, res, next) => {
  try {
    const { sql, params } = buildAuditFilters(req);
    const result = await query(
      `SELECT al.id, al.action, u.full_name AS user_name, u.role AS user_role,
              al.table_name, al.record_id, al.ip_address, al.created_at,
              al.old_values, al.new_values${sql}
       ORDER BY al.created_at DESC LIMIT 5000`,
      params
    );

    const header = [
      'Log ID', 'Action', 'User', 'Role', 'Table', 'Record ID',
      'IP Address', 'Timestamp', 'Old Values', 'New Values',
    ];
    const rows = result.rows.map((log) => [
      log.id,
      log.action,
      log.user_name || 'System',
      log.user_role || '',
      log.table_name || '',
      log.record_id ?? '',
      log.ip_address || '',
      log.created_at ? new Date(log.created_at).toISOString() : '',
      log.old_values ? JSON.stringify(log.old_values) : '',
      log.new_values ? JSON.stringify(log.new_values) : '',
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map(csvEscape).join(','))
      .join('\n');

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${stamp}.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs, exportAuditLogs };
