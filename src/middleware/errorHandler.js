const { validationResult } = require('express-validator');

// Validate express-validator results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry. Record already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'Constraint violation: ' + err.detail });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
};

// 404 handler
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
};

module.exports = { validate, errorHandler, notFound };