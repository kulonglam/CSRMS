// Auth Controller
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { auditLog } = require('../middleware/audit');
const { isEmailConfigured, sendPasswordResetEmail } = require('../utils/email');

const RESET_TOKEN_HOURS = 1;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildResetUrl(token) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  return `${base}/pages/reset-password.html?token=${encodeURIComponent(token)}`;
}

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const result = await query(
      'SELECT id, branch_id, full_name, username, password_hash, role, status FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const jti = uuidv4();
    const token = jwt.sign(
      { userId: user.id, role: user.role, jti },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    await auditLog({
      userId: user.id,
      action: 'LOGIN',
      tableName: 'users',
      recordId: user.id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          role: user.role,
          branch_id: user.branch_id,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const logout = async (req, res) => {
  try {
    const payload = req.tokenPayload;
    if (payload?.jti && payload?.exp) {
      const expiresAt = new Date(payload.exp * 1000);
      await query(
        'INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING',
        [payload.jti, expiresAt]
      );
      await query('DELETE FROM revoked_tokens WHERE expires_at <= NOW()');
    }

    await auditLog({
      userId: req.user.id,
      action: 'LOGOUT',
      tableName: 'users',
      recordId: req.user.id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required',
      });
    }

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const passwordMatch = await bcrypt.compare(
      current_password,
      result.rows[0].password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    await auditLog({
      userId,
      action: 'CHANGE_PASSWORD',
      tableName: 'users',
      recordId: userId,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;
    const genericMessage = 'If an account with that username exists, password reset instructions have been sent.';

    if (!username?.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    const userResult = await query(
      'SELECT id, username, email, status FROM users WHERE username = $1',
      [username.trim()]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const user = userResult.rows[0];
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);

    await query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );

    await query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = buildResetUrl(plainToken);
    let emailSent = false;

    if (user.email && isEmailConfigured()) {
      emailSent = await sendPasswordResetEmail(user.email, resetUrl);
    }

    await auditLog({
      userId: user.id,
      action: 'FORGOT_PASSWORD',
      tableName: 'users',
      recordId: user.id,
      ipAddress: req.ip,
    });

    const response = { success: true, message: genericMessage };
    if (!emailSent && process.env.NODE_ENV !== 'production') {
      response.data = { reset_url: resetUrl, note: 'Email not configured — use this link in development only.' };
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const tokenHash = hashToken(token);
    const tokenResult = await query(
      `SELECT prt.*, u.id AS user_id
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW() AND u.status = 'active'`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const resetRow = tokenResult.rows[0];
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newPasswordHash,
      resetRow.user_id,
    ]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetRow.id]);

    await auditLog({
      userId: resetRow.user_id,
      action: 'RESET_PASSWORD',
      tableName: 'users',
      recordId: resetRow.user_id,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  login,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
