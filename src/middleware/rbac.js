// Role-Based Access Control (RBAC) Middleware
const { ROLES } = require('../constants');

/**
 * Check if user has required role
 * Usage: app.use('/api/admin', requireRole('admin'))
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Check if user belongs to their assigned branch
 * For multi-branch data access
 */
const requireSameBranch = (req, res, next) => {
  const requestedBranchId = req.body.branch_id || req.query.branch_id || req.params.branch_id;

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Directors can access any branch
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  // Other users must access their own branch
  if (req.user.branch_id && requestedBranchId && req.user.branch_id !== parseInt(requestedBranchId)) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your assigned branch',
    });
  }

  next();
};

/**
 * Manager-specific permissions
 */
const requireManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (![ROLES.MANAGER, ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only managers can perform this action',
    });
  }

  next();
};

/**
 * Sales Agent-specific permissions
 */
const requireSalesAgent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (![ROLES.SALES_AGENT, ROLES.MANAGER, ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Sales agents cannot perform this action',
    });
  }

  next();
};

module.exports = {
  requireRole,
  requireSameBranch,
  requireManager,
  requireSalesAgent,
};
