const router = require('express').Router();
const { body } = require('express-validator');
const { getUsers, getUser, createUser, updateUser, resetPassword } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', authorize('director', 'manager'), getUsers);
router.get('/:id', authorize('director', 'manager'), getUser);

router.post('/', authorize('director', 'manager'), [
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').isIn(['director', 'manager', 'sales_agent']).withMessage('Invalid role.'),
  validate,
], createUser);

router.put('/:id', authorize('director', 'manager'), updateUser);

router.post('/:id/reset-password', authorize('director', 'manager'), [
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  validate,
], resetPassword);

module.exports = router;