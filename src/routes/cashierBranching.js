const router = require('express').Router();
const { body } = require('express-validator');
const { getBalances, getAgentDailySummary, createBalance, approveBalance } = require('../controllers/cashierBalancingController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate, authorize('manager'));

router.get('/', getBalances);
router.get('/agent/:agentId/summary', getAgentDailySummary);

router.post('/', [
  body('sales_agent_id').isInt({ min: 1 }).withMessage('Valid agent ID is required.'),
  body('submitted_amount').isFloat({ min: 0 }).withMessage('Submitted amount must be a positive number.'),
  validate,
], createBalance);

router.patch('/:id/approve', approveBalance);

module.exports = router;