const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDirectorDashboard,
  getManagerDashboard,
  getSalesAgentDashboard,
} = require('../controllers/dashboardController');

router.use(authenticate);

// Director Dashboard
router.get('/director', authorize('director'), getDirectorDashboard);

// Manager Dashboard
router.get('/manager', authorize('manager'), getManagerDashboard);

// Sales Agent Dashboard
router.get('/agent', authorize('sales_agent', 'manager'), getSalesAgentDashboard);

module.exports = router;
