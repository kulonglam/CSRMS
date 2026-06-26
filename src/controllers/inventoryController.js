const { query, getClient } = require('../config/database');
const { auditLog } = require('../middleware/audit');
const { createLowStockNotification } = require('../utils/notifications');
const { parsePagination, paginationMeta } = require('../utils/helpers');
const { getEffectiveBranchId } = require('../utils/branchAccess');

// GET /api/inventory
const getInventory = async (req, res, next) => {
  try {
    const { branch_id, low_stock, out_of_stock, search } = req.query;
    const effectiveBranchId = getEffectiveBranchId(req.user, branch_id);

    let sql = `SELECT i.id, i.quantity_available, i.updated_at,
                      p.id AS product_id, p.name AS product_name, p.reorder_level,
                      p.selling_price, p.cost_price, p.status AS product_status,
                      c.name AS category_name, c.id AS category_id,
                      b.id AS branch_id, b.name AS branch_name,
                      CASE
                        WHEN i.quantity_available = 0 THEN 'out_of_stock'
                        WHEN i.quantity_available <= p.reorder_level THEN 'low_stock'
                        ELSE 'in_stock'
                      END AS stock_status
               FROM inventory i
               JOIN products p ON p.id = i.product_id
               JOIN categories c ON c.id = p.category_id
               JOIN branches b ON b.id = i.branch_id
               WHERE 1=1`;
    const params = [];

    if (effectiveBranchId) { params.push(effectiveBranchId); sql += ` AND i.branch_id = $${params.length}`; }
    if (search)            { params.push(`%${search}%`);     sql += ` AND p.name ILIKE $${params.length}`; }
    if (low_stock === 'true')     sql += ` AND i.quantity_available > 0 AND i.quantity_available <= p.reorder_level`;
    if (out_of_stock === 'true')  sql += ` AND i.quantity_available = 0`;

    const fromJoin = ` FROM inventory i
               JOIN products p ON p.id = i.product_id
               JOIN categories c ON c.id = p.category_id
               JOIN branches b ON b.id = i.branch_id
               WHERE 1=1${sql.slice(sql.indexOf('WHERE 1=1') + 9)}`;

    const countResult = await query(`SELECT COUNT(*)::int AS total${fromJoin}`, params);
    const total = countResult.rows[0].total;
    const { page, limit, offset } = parsePagination(req.query);

    sql += ` ORDER BY p.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const result = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/inventory/adjust
const adjustStock = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { product_id, quantity, reason } = req.body;
    const branch_id = req.user.branch_id;

    // Fetch current inventory
    const inv = await client.query(
      'SELECT * FROM inventory WHERE product_id = $1 AND branch_id = $2',
      [product_id, branch_id]
    );
    if (inv.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Inventory record not found for this product and branch.' });

    const currentQty = inv.rows[0].quantity_available;
    const newQty = currentQty + quantity;

    if (newQty < 0)
      return res.status(400).json({
        success: false,
        message: `Adjustment would result in negative stock. Current quantity: ${currentQty}.`,
      });

    // Update inventory
    const updated = await client.query(
      'UPDATE inventory SET quantity_available = $1, updated_at = NOW() WHERE product_id = $2 AND branch_id = $3 RETURNING *',
      [newQty, product_id, branch_id]
    );

    // Record adjustment
    const adjustment = await client.query(
      `INSERT INTO stock_adjustments (product_id, branch_id, adjusted_by, quantity, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [product_id, branch_id, req.user.id, quantity, reason]
    );

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, action: 'STOCK_ADJUSTMENT', tableName: 'inventory',
      recordId: updated.rows[0].id,
      oldValues: { quantity_available: currentQty },
      newValues: { quantity_available: newQty, reason },
      ipAddress: req.ip,
    });

    await createLowStockNotification(product_id, branch_id, newQty);

    res.json({
      success: true,
      message: 'Stock adjustment recorded.',
      data: { inventory: updated.rows[0], adjustment: adjustment.rows[0] },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/inventory/adjustments
const getAdjustments = async (req, res, next) => {
  try {
    const branch_id = req.user.role === 'manager' ? req.user.branch_id : req.query.branch_id;
    let sql = `SELECT sa.*, p.name AS product_name, b.name AS branch_name, u.full_name AS adjusted_by_name
               FROM stock_adjustments sa
               JOIN products p ON p.id = sa.product_id
               JOIN branches b ON b.id = sa.branch_id
               JOIN users u ON u.id = sa.adjusted_by
               WHERE 1=1`;
    const params = [];
    if (branch_id) { params.push(branch_id); sql += ` AND sa.branch_id = $${params.length}`; }
    sql += ' ORDER BY sa.created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInventory, adjustStock, getAdjustments };