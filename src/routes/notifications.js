const router = require('express').Router();
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../controllers/notificationsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('manager'));

router.get('/',             getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all',   markAllAsRead);
router.patch('/:id/read',   markAsRead);

module.exports = router;