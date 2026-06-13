const { query, getClient } = require('../config/database');
const { auditLog } = require('../middleware/audit');
const { createLowStockNotification } = require('../utils/notifications');

// GET /api/procurements
const getProcurements = async (req, res, next) => {
  try {
    const { branch_id, product_id, from_date, to_date } = req.query;

    // Enforce branch scope for managers
    const effectiveBranchId = req.user.role === 'manager' ? req.user.branch_id : branch_id;

    let sql = `SELECT pr.*, p.name AS product_name, b.name AS branch_name,
                      u.full_name AS recorded_by_name
               FROM procurements pr
               JOIN products p ON p.id = pr.product_id
               JOIN branches b ON b.id = pr.branch_id
               JOIN users u ON u.id = pr.recorded_by
               WHERE 1=1`;
    const params = [];

    if (effectiveBranchId) { params.push(effectiveBranchId); sql += ` AND pr.branch_id = $${params.length}`; }
    if (product_id)        { params.push(product_id);        sql += ` AND pr.product_id = $${params.length}`; }
    if (from_date)         { params.push(from_date);         sql += ` AND pr.date_received >= $${params.length}`; }
    if (to_date)           { params.push(to_date);           sql += ` AND pr.date_received <= $${params.length}`; }

    sql += ' ORDER BY pr.created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/procurements/:id
const getProcurement = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pr.*, p.name AS product_name, b.name AS branch_name, u.full_name AS recorded_by_name
       FROM procurements pr
       JOIN products p ON p.id = pr.product_id
       JOIN branches b ON b.id = pr.branch_id
       JOIN users u ON u.id = pr.recorded_by
       WHERE pr.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Procurement not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/procurements
const createProcurement = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { product_id, supplier_name, quantity_received, cost_price, date_received, notes } = req.body;
    const branch_id = req.user.branch_id;

    // Verify product is active
    const product = await client.query(
      "SELECT id, name FROM products WHERE id = $1 AND status = 'active'",
      [product_id]
    );
    if (product.rows.length === 0)
      return res.status(400).json({ success: false, message: 'Product not found or inactive.' });

    // Insert procurement record
    const procurement = await client.query(
      `INSERT INTO procurements (product_id, branch_id, recorded_by, supplier_name, quantity_received, cost_price, date_received, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [product_id, branch_id, req.user.id, supplier_name, quantity_received, cost_price, date_received || new Date(), notes]
    );

    // Upsert inventory: create if not exists, otherwise add quantity
    const inventory = await client.query(
      `INSERT INTO inventory (product_id, branch_id, quantity_available)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, branch_id)
       DO UPDATE SET quantity_available = inventory.quantity_available + $3, updated_at = NOW()
       RETURNING *`,
      [product_id, branch_id, quantity_received]
    );

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, action: 'CREATE_PROCUREMENT', tableName: 'procurements',
      recordId: procurement.rows[0].id, newValues: procurement.rows[0], ipAddress: req.ip,
    });

    // Check if stock was previously at low/zero — notify if still below reorder
    await createLowStockNotification(product_id, branch_id, inventory.rows[0].quantity_available);

    res.status(201).json({
      success: true,
      message: 'Procurement recorded and inventory updated.',
      data: {
        procurement: procurement.rows[0],
        inventory: inventory.rows[0],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getProcurements, getProcurement, createProcurement };