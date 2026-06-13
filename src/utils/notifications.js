const { query } = require('../config/database');

/**
 * Check inventory level against reorder level and create
 * low_stock or out_of_stock notifications for the branch.
 */
const createLowStockNotification = async (productId, branchId, currentQty) => {
  try {
    const product = await query(
      'SELECT id, name, reorder_level FROM products WHERE id = $1',
      [productId]
    );
    if (product.rows.length === 0) return;

    const { name, reorder_level } = product.rows[0];

    let type = null;
    let message = null;

    if (currentQty === 0) {
      type = 'out_of_stock';
      message = `"${name}" is now OUT OF STOCK at branch #${branchId}. Immediate procurement required.`;
    } else if (currentQty <= reorder_level) {
      type = 'low_stock';
      message = `"${name}" is running LOW on stock. Current: ${currentQty}, Reorder level: ${reorder_level}.`;
    }

    if (!type) return;

    // Avoid duplicate unread notifications for the same product/branch/type
    const existing = await query(
      `SELECT id FROM notifications
       WHERE product_id = $1 AND branch_id = $2 AND type = $3 AND is_read = FALSE`,
      [productId, branchId, type]
    );
    if (existing.rows.length > 0) return;

    // Notify all managers of this branch
    const managers = await query(
      "SELECT id FROM users WHERE branch_id = $1 AND role = 'manager' AND status = 'active'",
      [branchId]
    );

    for (const manager of managers.rows) {
      await query(
        `INSERT INTO notifications (branch_id, user_id, type, message, product_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [branchId, manager.id, type, message, productId]
      );
    }
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
};

module.exports = { createLowStockNotification };