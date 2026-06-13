const router = require('express').Router();
const { body } = require('express-validator');
const { getProcurements, getProcurement, createProcurement } = require('../controllers/procurementController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', authorize('director', 'manager'), getProcurements);
router.get('/:id', authorize('director', 'manager'), getProcurement);

router.post('/', authorize('manager'), [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required.'),
  body('supplier_name').trim().notEmpty().withMessage('Supplier name is required.'),
  body('quantity_received').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
  body('cost_price').isFloat({ min: 0 }).withMessage('Cost price must be a positive number.'),
  validate,
], createProcurement);

module.exports = router;