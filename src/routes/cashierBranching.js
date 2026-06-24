const router = require('express').Router();
const { body } = require('express-validator');
const {
  getBalances,
  getAgentDailySummary,
  getMyDailySummary,
  agentSubmitBalance,
  createBalance,
  approveBalance,
  rejectBalance,
} = require('../controllers/cashierBalancingController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

// Sales agent — submit own cash and view own summary
router.get('/my-summary', authorize('sales_agent'), getMyDailySummary);
router.post('/submit', authorize('sales_agent'), [
  body('submitted_amount').isFloat({ min: 0 }).withMessage('Submitted amount must be a positive number.'),
  validate,
], agentSubmitBalance);

// Manager — verify and reconcile
router.use(authorize('manager'));

router.get('/', getBalances);
router.get('/agent/:agentId/summary', getAgentDailySummary);

router.post('/', [
  body('sales_agent_id').isInt({ min: 1 }).withMessage('Valid agent ID is required.'),
  body('submitted_amount').isFloat({ min: 0 }).withMessage('Submitted amount must be a positive number.'),
  validate,
], createBalance);

router.patch('/:id/approve', approveBalance);

router.patch('/:id/reject', [
  body('reason').trim().notEmpty().withMessage('Rejection reason is required.'),
  validate,
], rejectBalance);

module.exports = router;
