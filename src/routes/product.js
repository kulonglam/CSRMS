const router = require('express').Router();
const { body } = require('express-validator');
const { getProducts, getProduct, createProduct, updateProduct, updatePrice, deleteProduct } = require('../controllers/productController');
const { getBarcodes, addBarcode } = require('../controllers/barcodeController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProduct);

router.post('/', authorize('manager'), [
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required.'),
  body('name').trim().notEmpty().withMessage('Product name is required.'),
  body('cost_price').isFloat({ min: 0 }).withMessage('Cost price must be a positive number.'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number.'),
  validate,
], createProduct);

router.put('/:id', authorize('manager'), updateProduct);

router.patch('/:id/price', authorize('manager'), [
  body('cost_price').optional().isFloat({ min: 0 }),
  body('selling_price').optional().isFloat({ min: 0 }),
  validate,
], updatePrice);

router.delete('/:id', authorize('manager'), deleteProduct);

// Nested barcodes
router.get('/:productId/barcodes', getBarcodes);
router.post('/:productId/barcodes', authorize('manager'), [
  body('barcode_number').trim().notEmpty().withMessage('Barcode number is required.'),
  validate,
], addBarcode);

module.exports = router;