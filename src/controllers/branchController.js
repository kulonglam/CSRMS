// Branch Controller
const { query } = require('../config/database');

const getBranches = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
        id, name, location, status, created_at, updated_at
      FROM branches
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND status = $1`;
      params.push(status);
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branchResult = await query(
      'SELECT id, name, location, status, created_at, updated_at FROM branches WHERE id = $1',
      [id]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    // Get branch stats
    const statsResult = await query(
      `
      SELECT 
        COUNT(DISTINCT u.id) as staff_count,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(i.quantity_available), 0) as inventory_count
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id
      LEFT JOIN inventory i ON b.id = i.branch_id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE b.id = $1
      GROUP BY b.id
      `,
      [id]
    );

    const branch = branchResult.rows[0];
    if (statsResult.rows.length > 0) {
      branch.stats = {
        staff_count: parseInt(statsResult.rows[0].staff_count),
        product_count: parseInt(statsResult.rows[0].product_count),
        inventory_count: parseInt(statsResult.rows[0].inventory_count),
      };
    }

    res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const createBranch = async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Branch name is required',
      });
    }

    const result = await query(
      'INSERT INTO branches (name, location) VALUES ($1, $2) RETURNING id, name, location, status, created_at',
      [name, location || null]
    );

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE_BRANCH', 'branches', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Branch name already exists',
      });
    }
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, status } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramCount++}`);
      updateValues.push(location);
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
      UPDATE branches SET ${updateFields.join(', ')} WHERE id = $${paramCount}
      RETURNING id, name, location, status, updated_at
      `,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'UPDATE_BRANCH', 'branches', id, JSON.stringify(result.rows[0])]
    );

    res.status(200).json({
      success: true,
      message: 'Branch updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Branch name already exists',
      });
    }
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branchResult = await query('SELECT id, name, status FROM branches WHERE id = $1', [id]);
    if (branchResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const deps = await query(
      `SELECT
        (SELECT COUNT(*) FROM inventory WHERE branch_id = $1) AS inventory_count,
        (SELECT COUNT(*) FROM sales WHERE branch_id = $1) AS sales_count,
        (SELECT COUNT(*) FROM procurements WHERE branch_id = $1) AS procurement_count,
        (SELECT COUNT(*) FROM users WHERE branch_id = $1) AS user_count`,
      [id]
    );
    const { inventory_count, sales_count, procurement_count, user_count } = deps.rows[0];
    const hasRecords = [inventory_count, sales_count, procurement_count, user_count]
      .some((count) => parseInt(count, 10) > 0);

    if (hasRecords) {
      const result = await query(
        `UPDATE branches SET status = 'inactive', updated_at = NOW() WHERE id = $1
         RETURNING id, name, location, status, updated_at`,
        [id]
      );

      await query(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'DEACTIVATE_BRANCH', 'branches', id, JSON.stringify(result.rows[0])]
      );

      return res.status(200).json({
        success: true,
        message: 'Branch has related records and was deactivated instead of deleted.',
        data: result.rows[0],
      });
    }

    await query('DELETE FROM branches WHERE id = $1', [id]);

    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'DELETE_BRANCH', 'branches', id, JSON.stringify(branchResult.rows[0])]
    );

    res.status(200).json({
      success: true,
      message: 'Branch deleted successfully',
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
};
