const router = require('express').Router();
const { getAuditLogs } = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('director', 'manager', 'sales_agent'));

router.get('/', getAuditLogs);

module.exports = router;