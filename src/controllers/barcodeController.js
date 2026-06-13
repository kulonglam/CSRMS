const { query } = require('../config/database');
const { auditLog } = require('../middleware/audit');

// GET /api/products/:productId/barcodes
const getBarcodes = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM product_barcodes WHERE product_id = $1 ORDER BY id',
      [req.params.productId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/products/:productId/barcodes
const addBarcode = async (req, res, next) => {
  try {
    const { barcode_number } = req.body;
    const { productId } = req.params;

    // Verify product exists
    const product = await query('SELECT id FROM products WHERE id = $1', [productId]);
    if (product.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Product not found.' });

    // Barcode must be globally unique
    const existing = await query(
      'SELECT id FROM product_barcodes WHERE barcode_number = $1',
      [barcode_number]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ success: false, message: 'Barcode number already exists in the system.' });

    const result = await query(
      'INSERT INTO product_barcodes (product_id, barcode_number) VALUES ($1, $2) RETURNING *',
      [productId, barcode_number]
    );

    await auditLog({
      userId: req.user.id, action: 'ADD_BARCODE', tableName: 'product_barcodes',
      recordId: result.rows[0].id, newValues: result.rows[0], ipAddress: req.ip,
    });
    res.status(201).json({ success: true, message: 'Barcode added.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/barcodes/:id
const updateBarcode = async (req, res, next) => {
  try {
    const { barcode_number, status } = req.body;
    const existing = await query('SELECT * FROM product_barcodes WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Barcode not found.' });

    const b = existing.rows[0];

    // If changing barcode_number, ensure uniqueness
    if (barcode_number && barcode_number !== b.barcode_number) {
      const dup = await query(
        'SELECT id FROM product_barcodes WHERE barcode_number = $1 AND id != $2',
        [barcode_number, req.params.id]
      );
      if (dup.rows.length > 0)
        return res.status(409).json({ success: false, message: 'Barcode number already exists.' });
    }

    const result = await query(
      'UPDATE product_barcodes SET barcode_number = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [barcode_number || b.barcode_number, status || b.status, req.params.id]
    );

    await auditLog({
      userId: req.user.id, action: 'UPDATE_BARCODE', tableName: 'product_barcodes',
      recordId: +req.params.id, oldValues: b, newValues: result.rows[0], ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Barcode updated.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/barcodes/:id
const removeBarcode = async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM product_barcodes WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Barcode not found.' });

    await auditLog({
      userId: req.user.id, action: 'REMOVE_BARCODE', tableName: 'product_barcodes',
      recordId: +req.params.id, oldValues: result.rows[0], ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Barcode removed.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/barcodes/lookup/:barcode  — used by sales agent to scan
const lookupBarcode = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pb.barcode_number, p.id AS product_id, p.name AS product_name,
              p.selling_price, p.status AS product_status, c.name AS category_name
       FROM product_barcodes pb
       JOIN products p ON p.id = pb.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE pb.barcode_number = $1 AND pb.status = 'active'`,
      [req.params.barcode]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Barcode not found or inactive.' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBarcodes, addBarcode, updateBarcode, removeBarcode, lookupBarcode };