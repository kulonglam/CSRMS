const router = require('express').Router();
const { body } = require('express-validator');
const { getUsers, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

// Managers may list branch users (e.g. cashier balancing); only directors manage accounts.
router.get('/', authorize('director', 'manager'), getUsers);

router.post('/', authorize('director'), [
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').isIn(['director', 'manager', 'sales_agent']).withMessage('Invalid role.'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Valid email is required when provided.'),
  validate,
], createUser);

router.put('/:id', authorize('director'), [
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Valid email is required when provided.'),
  body('username').optional().trim().notEmpty().withMessage('Username cannot be empty.'),
  validate,
], updateUser);

router.post('/:id/reset-password', authorize('director'), [
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  validate,
], resetPassword);

router.delete('/:id', authorize('director'), deleteUser);

module.exports = router;
