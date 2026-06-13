const { query } = require('../config/database');

// GET /api/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { user_id, action, table_name, from_date, to_date } = req.query;

    let sql = `SELECT al.*, u.full_name AS user_name, u.role AS user_role
               FROM audit_logs al
               LEFT JOIN users u ON u.id = al.user_id
               WHERE 1=1`;
    const params = [];

    if (user_id)    { params.push(user_id);    sql += ` AND al.user_id = $${params.length}`; }
    if (action)     { params.push(`%${action}%`); sql += ` AND al.action ILIKE $${params.length}`; }
    if (table_name) { params.push(table_name); sql += ` AND al.table_name = $${params.length}`; }
    if (from_date)  { params.push(from_date);  sql += ` AND al.created_at >= $${params.length}`; }
    if (to_date)    { params.push(to_date);    sql += ` AND al.created_at <= $${params.length}`; }

    sql += ' ORDER BY al.created_at DESC LIMIT 200';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs };