const { query, getClient } = require('../config/database');
const { auditLog } = require('../middleware/audit');
const { generateReceiptNumber } = require('../utils/helpers');
const { createLowStockNotification } = require('../utils/notifications');

// GET /api/sales
const getSales = async (req, res, next) => {
  try {
    const { branch_id, agent_id, from_date, to_date, status } = req.query;
    const effectiveBranchId = req.user.role !== 'director' ? req.user.branch_id : branch_id;

    let sql = `SELECT s.id, s.receipt_number, s.total_amount, s.amount_paid, s.change_given,
                      s.status, s.sale_date, s.created_at,
                      u.full_name AS sales_agent_name, u.id AS sales_agent_id,
                      b.name AS branch_name, b.id AS branch_id
               FROM sales s
               JOIN users u ON u.id = s.sales_agent_id
               JOIN branches b ON b.id = s.branch_id
               WHERE 1=1`;
    const params = [];

    if (effectiveBranchId) { params.push(effectiveBranchId); sql += ` AND s.branch_id = $${params.length}`; }
    if (agent_id)          { params.push(agent_id);          sql += ` AND s.sales_agent_id = $${params.length}`; }
    if (from_date)         { params.push(from_date);         sql += ` AND s.sale_date >= $${params.length}`; }
    if (to_date)           { params.push(to_date);           sql += ` AND s.sale_date <= $${params.length}`; }
    if (status)            { params.push(status);            sql += ` AND s.status = $${params.length}`; }

    sql += ' ORDER BY s.created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/sales/:id
const getSale = async (req, res, next) => {
  try {
    const saleResult = await query(
      `SELECT s.*, u.full_name AS sales_agent_name, b.name AS branch_name
       FROM sales s
       JOIN users u ON u.id = s.sales_agent_id
       JOIN branches b ON b.id = s.branch_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (saleResult.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Sale not found.' });

    const itemsResult = await query(
      `SELECT si.*, p.name AS product_name, c.name AS category_name
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE si.sale_id = $1`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...saleResult.rows[0], items: itemsResult.rows },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales  — process a sale transaction
const createSale = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { items, amount_paid } = req.body;
    // items = [{ product_id, quantity }]
    const branch_id = req.user.branch_id;

    if (!items || items.length === 0)
      return res.status(400).json({ success: false, message: 'Sale must have at least one item.' });

    let totalAmount = 0;
    const resolvedItems = [];

    for (const item of items) {
      // Lock inventory row for this product/branch
      const inv = await client.query(
        `SELECT i.quantity_available, p.selling_price, p.name AS product_name, p.status
         FROM inventory i
         JOIN products p ON p.id = i.product_id
         WHERE i.product_id = $1 AND i.branch_id = $2
         FOR UPDATE`,
        [item.product_id, branch_id]
      );

      if (inv.rows.length === 0)
        throw Object.assign(new Error(`Product ID ${item.product_id} not found in inventory for this branch.`), { status: 400 });

      const { quantity_available, selling_price, product_name, status } = inv.rows[0];

      if (status !== 'active')
        throw Object.assign(new Error(`Product "${product_name}" is not available for sale.`), { status: 400 });

      if (quantity_available < item.quantity)
        throw Object.assign(
          new Error(`Insufficient stock for "${product_name}". Available: ${quantity_available}, requested: ${item.quantity}.`),
          { status: 400 }
        );

      const subtotal = selling_price * item.quantity;
      totalAmount += subtotal;
      resolvedItems.push({ product_id: item.product_id, quantity: item.quantity, unit_price: selling_price, product_name });
    }

    if (amount_paid < totalAmount)
      throw Object.assign(new Error(`Amount paid (${amount_paid}) is less than total (${totalAmount}).`), { status: 400 });

    // Insert sale
    const receiptNumber = generateReceiptNumber();
    const sale = await client.query(
      `INSERT INTO sales (branch_id, sales_agent_id, total_amount, amount_paid, receipt_number, sale_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING *`,
      [branch_id, req.user.id, totalAmount, amount_paid, receiptNumber]
    );

    const saleId = sale.rows[0].id;

    // Insert sale items & reduce inventory
    for (const item of resolvedItems) {
      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [saleId, item.product_id, item.quantity, item.unit_price]
      );

      const updatedInv = await client.query(
        `UPDATE inventory SET quantity_available = quantity_available - $1, updated_at = NOW()
         WHERE product_id = $2 AND branch_id = $3 RETURNING quantity_available`,
        [item.quantity, item.product_id, branch_id]
      );

      // Check low/out-of-stock after sale
      await createLowStockNotification(item.product_id, branch_id, updatedInv.rows[0].quantity_available);
    }

    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, action: 'CREATE_SALE', tableName: 'sales',
      recordId: saleId, newValues: { receipt_number: receiptNumber, total_amount: totalAmount }, ipAddress: req.ip,
    });

    // Fetch full sale with items for receipt
    const fullSale = await query(
      `SELECT s.*, u.full_name AS sales_agent_name, b.name AS branch_name
       FROM sales s JOIN users u ON u.id = s.sales_agent_id JOIN branches b ON b.id = s.branch_id
       WHERE s.id = $1`,
      [saleId]
    );
    const saleItems = await query(
      `SELECT si.*, p.name AS product_name FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = $1`,
      [saleId]
    );

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully.',
      data: { ...fullSale.rows[0], items: saleItems.rows },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /api/sales/:id/void  — manager can void a sale
const voidSale = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const sale = await client.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (sale.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    if (sale.rows[0].status === 'voided')
      return res.status(400).json({ success: false, message: 'Sale is already voided.' });

    // Restore inventory
    const items = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of items.rows) {
      await client.query(
        'UPDATE inventory SET quantity_available = quantity_available + $1, updated_at = NOW() WHERE product_id = $2 AND branch_id = $3',
        [item.quantity, item.product_id, sale.rows[0].branch_id]
      );
    }

    await client.query("UPDATE sales SET status = 'voided' WHERE id = $1", [req.params.id]);
    await client.query('COMMIT');

    await auditLog({
      userId: req.user.id, action: 'VOID_SALE', tableName: 'sales',
      recordId: +req.params.id, ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Sale voided and inventory restored.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getSales, getSale, createSale, voidSale };