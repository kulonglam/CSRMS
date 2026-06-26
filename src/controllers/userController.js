// User Controller
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const getUsers = async (req, res) => {
  try {
    const { branch_id, role, status } = req.query;

    let sql = `
      SELECT 
        u.id, u.full_name, u.username, u.email, u.branch_id, b.name as branch_name,
        u.role, u.status, u.created_at
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (req.user.role === 'manager') {
      sql += ` AND u.branch_id = $${paramCount++}`;
      params.push(req.user.branch_id);
    }

    if (branch_id) {
      sql += ` AND u.branch_id = $${paramCount++}`;
      params.push(branch_id);
    }
    if (role) {
      sql += ` AND u.role = $${paramCount++}`;
      params.push(role);
    }
    if (status) {
      sql += ` AND u.status = $${paramCount++}`;
      params.push(status);
    }

    sql += ' ORDER BY u.full_name ASC';

    const result = await query(sql, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { full_name, username, password, branch_id, role, email } = req.body;

    if (!full_name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Full name, username, password, and role are required',
      });
    }

    // Validate role
    const validRoles = ['director', 'manager', 'sales_agent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be director, manager, or sales_agent',
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `
      INSERT INTO users (full_name, username, email, password_hash, branch_id, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, full_name, username, email, branch_id, role, status, created_at
      `,
      [full_name, username, email?.trim() || null, password_hash, branch_id || null, role]
    );

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE_USER', 'users', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      const field = error.detail?.includes('email') ? 'Email' : 'Username';
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, branch_id, role, status, email, username } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramCount++}`);
      updateValues.push(full_name);
    }
    if (username !== undefined) {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        return res.status(400).json({ success: false, message: 'Username cannot be empty.' });
      }
      updateFields.push(`username = $${paramCount++}`);
      updateValues.push(trimmedUsername);
    }
    if (branch_id !== undefined) {
      updateFields.push(`branch_id = $${paramCount++}`);
      updateValues.push(branch_id);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramCount++}`);
      updateValues.push(role);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(email?.trim() || null);
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
      UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}
      RETURNING id, full_name, username, email, branch_id, role, status, updated_at
      `,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Log audit trail
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'UPDATE_USER', 'users', id, JSON.stringify(result.rows[0])]
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      const field = error.detail?.includes('username') ? 'Username' : 'Email';
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: 'New password is required',
      });
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, username',
      [password_hash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'RESET_PASSWORD', 'users', id]
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const userResult = await query(
      `SELECT u.id, u.full_name, u.username, u.role, u.status, u.branch_id, b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const deps = await query(
      `SELECT
        (SELECT COUNT(*) FROM sales WHERE sales_agent_id = $1) AS sales_count,
        (SELECT COUNT(*) FROM procurements WHERE recorded_by = $1) AS procurement_count,
        (SELECT COUNT(*) FROM stock_adjustments WHERE adjusted_by = $1) AS adjustment_count,
        (SELECT COUNT(*) FROM cashier_balancing WHERE sales_agent_id = $1 OR manager_id = $1) AS balancing_count`,
      [userId]
    );

    const { sales_count, procurement_count, adjustment_count, balancing_count } = deps.rows[0];
    const hasRecords = [sales_count, procurement_count, adjustment_count, balancing_count]
      .some((count) => parseInt(count, 10) > 0);

    const user = userResult.rows[0];

    if (hasRecords) {
      if (user.status === 'inactive') {
        return res.status(400).json({
          success: false,
          message: 'User is already inactive and has related records that prevent deletion.',
        });
      }

      const result = await query(
        `UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = $1
         RETURNING id, full_name, username, branch_id, role, status, updated_at`,
        [userId]
      );

      await query(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'DEACTIVATE_USER', 'users', userId, JSON.stringify(result.rows[0])]
      );

      return res.status(200).json({
        success: true,
        message: 'User has related records and was deactivated instead of deleted.',
        data: result.rows[0],
      });
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);

    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'DELETE_USER', 'users', userId, JSON.stringify(user)]
    );

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
};
