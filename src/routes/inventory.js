const router = require('express').Router();
const { body } = require('express-validator');
const { getInventory, getInventoryItem, adjustStock, getAdjustments } = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', getInventory);
router.get('/adjustments', authorize('manager'), getAdjustments);
router.get('/product/:productId/branch/:branchId', getInventoryItem);

router.post('/adjust', authorize('manager'), [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required.'),
  body('quantity').isInt().withMessage('Quantity must be an integer (positive or negative).'),
  body('reason').trim().notEmpty().withMessage('Reason for adjustment is required.'),
  validate,
], adjustStock);

module.exports = router;