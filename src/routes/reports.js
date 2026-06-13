const router = require('express').Router();
const {
  dailySalesReport,
  inventoryReport,
  procurementReport,
  cashierBalancingReport,
  companyPerformanceReport,
  salesTrends,
} = require('../controllers/reportsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Manager + Director reports
router.get('/sales/daily',          authorize('manager', 'director'), dailySalesReport);
router.get('/sales/trends',         authorize('manager', 'director'), salesTrends);
router.get('/inventory',            authorize('manager', 'director'), inventoryReport);
router.get('/procurement',          authorize('manager', 'director'), procurementReport);
router.get('/cashier-balancing',    authorize('manager'), cashierBalancingReport);

// Director-only
router.get('/company/performance',  authorize('director'), companyPerformanceReport);

module.exports = router;