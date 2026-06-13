const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getReceipts,
  getReceipt,
  downloadReceiptPDF,
  printReceipt,
} = require('../controllers/receiptController');

router.use(authenticate);

// Get all receipts
router.get('/', authorize('director', 'manager'), getReceipts);

// Get single receipt
router.get('/:id', getReceipt);

// Download receipt as PDF
router.get('/:id/pdf', downloadReceiptPDF);

// Print receipt
router.post('/:id/print', authorize('sales_agent', 'manager'), printReceipt);

module.exports = router;
