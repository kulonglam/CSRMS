// Product Controller
const { query } = require('../config/database');

const getProducts = async (req, res) => {
  try {
    const { category_id, status } = req.query;
    const branch_id = req.user.branch_id;

    let sql = `
      SELECT 
        p.id, p.category_id, c.name as category_name, p.name, p.description,
        p.cost_price, p.selling_price as price, p.reorder_level, p.status, p.created_at,
        COALESCE(i.quantity_available, 0) as quantity_in_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id AND i.branch_id = $1
      WHERE 1=1
    `;
    const params = [branch_id];
    let paramCount = 2;

    if (category_id) {
      sql += ` AND p.category_id = $${paramCount++}`;
      params.push(category_id);
    }
    if (status) {
      sql += ` AND p.status = $${paramCount++}`;
      params.push(status);
    }

    sql += ' ORDER BY p.name ASC';

    const result = await query(sql, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const branch_id = req.user.branch_id;

    const result = await query(
      `
      SELECT 
        p.id, p.category_id, c.name as category_name, p.name, p.description,
        p.cost_price, p.selling_price as price, p.reorder_level, p.status, p.created_at,
        COALESCE(i.quantity_available, 0) as quantity_in_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id AND i.branch_id = $2
      WHERE p.id = $1
      `,
      [id, branch_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { category_id, name, description, cost_price, selling_price, reorder_level } = req.body;

    if (!category_id || !name || cost_price === undefined || selling_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Category, name, cost price, and selling price are required',
      });
    }

    const result = await query(
      `
      INSERT INTO products (category_id, name, description, cost_price, selling_price, reorder_level)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, category_id, name, description, cost_price, selling_price, reorder_level, status, created_at
      `,
      [category_id, name, description || null, cost_price, selling_price, reorder_level || 10]
    );

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE', 'products', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, cost_price, selling_price, reorder_level, status } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    if (cost_price !== undefined) {
      updateFields.push(`cost_price = $${paramCount++}`);
      updateValues.push(cost_price);
    }
    if (selling_price !== undefined) {
      updateFields.push(`selling_price = $${paramCount++}`);
      updateValues.push(selling_price);
    }
    if (reorder_level !== undefined) {
      updateFields.push(`reorder_level = $${paramCount++}`);
      updateValues.push(reorder_level);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await query(
      `
      UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramCount}
      RETURNING id, category_id, name, description, cost_price, selling_price, reorder_level, status, updated_at
      `,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'UPDATE', 'products', id, JSON.stringify(result.rows[0])]
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { cost_price, selling_price } = req.body;

    if (cost_price === undefined && selling_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one of cost_price or selling_price is required',
      });
    }

    const fields = [];
    const values = [];
    if (cost_price !== undefined) {
      fields.push(`cost_price = $${fields.length + 1}`);
      values.push(cost_price);
    }
    if (selling_price !== undefined) {
      fields.push(`selling_price = $${fields.length + 1}`);
      values.push(selling_price);
    }
    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `
      UPDATE products SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, name, cost_price, selling_price
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'UPDATE_PRICE', 'products', id]
    );

    res.status(200).json({
      success: true,
      message: 'Price updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update price error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product has sales
    const checkResult = await query(
      'SELECT COUNT(*) FROM sale_items WHERE product_id = $1',
      [id]
    );

    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product with existing sales',
      });
    }

    const result = await query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'DELETE', 'products', id]
    );

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  updatePrice,
  deleteProduct,
};
