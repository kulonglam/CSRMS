const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { downloadReceiptPDF } = require('../controllers/receiptController');

router.use(authenticate);

router.get('/:id/pdf', downloadReceiptPDF);

module.exports = router;
