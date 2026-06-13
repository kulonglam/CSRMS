const { query } = require('../config/database');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { is_read } = req.query;
    const branch_id = req.user.branch_id;

    let sql = `SELECT n.*, p.name AS product_name, b.name AS branch_name
               FROM notifications n
               LEFT JOIN products p ON p.id = n.product_id
               LEFT JOIN branches b ON b.id = n.branch_id
               WHERE (n.user_id = $1 OR n.branch_id = $2)`;
    const params = [req.user.id, branch_id];

    if (is_read !== undefined) {
      params.push(is_read === 'true');
      sql += ` AND n.is_read = $${params.length}`;
    }

    sql += ' ORDER BY n.created_at DESC LIMIT 50';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND (user_id = $2 OR branch_id = $3) RETURNING *',
      [req.params.id, req.user.id, req.user.branch_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, message: 'Notification marked as read.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE (user_id = $1 OR branch_id = $2) AND is_read = FALSE',
      [req.user.id, req.user.branch_id]
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) AS count FROM notifications WHERE (user_id = $1 OR branch_id = $2) AND is_read = FALSE',
      [req.user.id, req.user.branch_id]
    );
    res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };