const router = require('express').Router();
const { body } = require('express-validator');
const { getSales, getSale, createSale, voidSale } = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', authorize('director', 'manager', 'sales_agent'), getSales);
router.get('/:id', authorize('director', 'manager', 'sales_agent'), getSale);

router.post('/', authorize('sales_agent'), [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required.'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Valid product ID is required for each item.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1 for each item.'),
  body('amount_paid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number.'),
  validate,
], createSale);

router.patch('/:id/void', authorize('manager'), voidSale);

module.exports = router;