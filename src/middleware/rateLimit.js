const rateLimit = require('express-rate-limit');

const skipInTest = () => process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

module.exports = { globalLimiter, authLimiter };
