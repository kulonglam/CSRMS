const router = require('express').Router();
const { body } = require('express-validator');
const { login, logout, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validate,
], login);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

router.post('/change-password', authenticate, [
  body('current_password').notEmpty().withMessage('Current password is required.'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  validate,
], changePassword);

module.exports = router;