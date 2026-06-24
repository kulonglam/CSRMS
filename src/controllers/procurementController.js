const { query, getClient } = require('../config/database');
const { auditLog } = require('../middleware/audit');
const { createLowStockNotification } = require('../utils/notifications');
const { parsePagination, paginationMeta } = require('../utils/helpers');

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

    const fromJoin = ` FROM procurements pr
               JOIN products p ON p.id = pr.product_id
               JOIN branches b ON b.id = pr.branch_id
               JOIN users u ON u.id = pr.recorded_by
               WHERE 1=1${sql.slice(sql.indexOf('WHERE 1=1') + 9)}`;

    const countResult = await query(`SELECT COUNT(*)::int AS total${fromJoin}`, params);
    const total = countResult.rows[0].total;
    const { page, limit, offset } = parsePagination(req.query);

    sql += ` ORDER BY pr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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

async function assertManagerProcurementAccess(client, procurementId, managerBranchId) {
  const result = await client.query('SELECT * FROM procurements WHERE id = $1', [procurementId]);
  if (result.rows.length === 0) {
    const err = new Error('Procurement not found.');
    err.status = 404;
    throw err;
  }
  if (result.rows[0].branch_id !== managerBranchId) {
    const err = new Error('Access denied for this procurement record.');
    err.status = 403;
    throw err;
  }
  return result.rows[0];
}

async function adjustInventoryForProcurement(client, productId, branchId, delta) {
  const inv = await client.query(
    `SELECT id, quantity_available FROM inventory
     WHERE product_id = $1 AND branch_id = $2 FOR UPDATE`,
    [productId, branchId]
  );
  if (inv.rows.length === 0) {
    const err = new Error('Inventory record not found for this procurement.');
    err.status = 400;
    throw err;
  }
  const newQty = parseInt(inv.rows[0].quantity_available, 10) + delta;
  if (newQty < 0) {
    const err = new Error('Cannot reverse procurement: insufficient stock on hand.');
    err.status = 400;
    throw err;
  }
  await client.query(
    'UPDATE inventory SET quantity_available = $1, updated_at = NOW() WHERE id = $2',
    [newQty, inv.rows[0].id]
  );
  return newQty;
}

// PUT /api/procurements/:id — correct supplier/qty/cost/date/notes; adjusts inventory by qty delta
const updateProcurement = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const old = await assertManagerProcurementAccess(client, req.params.id, req.user.branch_id);

    const supplier_name = req.body.supplier_name ?? old.supplier_name;
    const quantity_received = req.body.quantity_received ?? old.quantity_received;
    const cost_price = req.body.cost_price ?? old.cost_price;
    const date_received = req.body.date_received ?? old.date_received;
    const notes = req.body.notes !== undefined ? req.body.notes : old.notes;

    if (!supplier_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }
    if (quantity_received < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }
    if (parseFloat(cost_price) < 0) {
      return res.status(400).json({ success: false, message: 'Cost price must be zero or greater.' });
    }

    const delta = parseInt(quantity_received, 10) - parseInt(old.quantity_received, 10);
    if (delta !== 0) {
      const newStock = await adjustInventoryForProcurement(client, old.product_id, old.branch_id, delta);
      await createLowStockNotification(old.product_id, old.branch_id, newStock);
    }

    const updated = await client.query(
      `UPDATE procurements
       SET supplier_name = $1, quantity_received = $2, cost_price = $3, date_received = $4, notes = $5
       WHERE id = $6
       RETURNING *`,
      [supplier_name.trim(), quantity_received, cost_price, date_received, notes, req.params.id]
    );

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id,
      action: 'UPDATE_PROCUREMENT',
      tableName: 'procurements',
      recordId: updated.rows[0].id,
      oldValues: old,
      newValues: updated.rows[0],
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Procurement updated and inventory adjusted.',
      data: updated.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  } finally {
    client.release();
  }
};

// DELETE /api/procurements/:id — reverse stock received
const deleteProcurement = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const old = await assertManagerProcurementAccess(client, req.params.id, req.user.branch_id);
    const newStock = await adjustInventoryForProcurement(
      client,
      old.product_id,
      old.branch_id,
      -parseInt(old.quantity_received, 10)
    );

    await client.query('DELETE FROM procurements WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    await createLowStockNotification(old.product_id, old.branch_id, newStock);

    await auditLog({
      userId: req.user.id,
      action: 'DELETE_PROCUREMENT',
      tableName: 'procurements',
      recordId: old.id,
      oldValues: old,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Procurement deleted and stock reversed.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getProcurements, getProcurement, createProcurement, updateProcurement, deleteProcurement };