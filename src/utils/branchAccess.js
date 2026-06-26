function accessError(message = 'Access denied.') {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function getEffectiveBranchId(user, queryBranchId) {
  if (user.role === 'director') return queryBranchId || null;
  return user.branch_id;
}

function assertRecordBranch(user, recordBranchId) {
  if (user.role === 'director') return;
  if (!user.branch_id || Number(user.branch_id) !== Number(recordBranchId)) {
    throw accessError('Access denied. Record belongs to another branch.');
  }
}

function assertSaleAccess(user, sale) {
  assertRecordBranch(user, sale.branch_id);
  if (user.role === 'sales_agent' && Number(sale.sales_agent_id) !== Number(user.id)) {
    throw accessError('Access denied. You can only access your own sales.');
  }
}

function handleAccessError(res, err, next) {
  if (err.status === 403) {
    return res.status(403).json({ success: false, message: err.message });
  }
  return next(err);
}

module.exports = {
  getEffectiveBranchId,
  assertRecordBranch,
  assertSaleAccess,
  handleAccessError,
};
