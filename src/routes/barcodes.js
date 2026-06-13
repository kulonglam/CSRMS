const router = require('express').Router();
const { body } = require('express-validator');
const { updateBarcode, removeBarcode, lookupBarcode } = require('../controllers/barcodeController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

// Lookup by barcode value (sales agents use this for scanning)
router.get('/lookup/:barcode', lookupBarcode);

router.put('/:id', authorize('manager'), [
  body('barcode_number').optional().trim().notEmpty(),
  validate,
], updateBarcode);

router.delete('/:id', authorize('manager'), removeBarcode);

module.exports = router;