const router = require('express').Router();
const { getAuditLogs, exportAuditLogs } = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('director', 'manager', 'sales_agent'));

router.get('/', getAuditLogs);
router.get('/export', authorize('director', 'manager'), exportAuditLogs);

module.exports = router;