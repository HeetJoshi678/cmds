const express = require('express');
const { getNotifications, markAsRead, createNotification } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.post('/', protect, authorize('Teacher', 'Principal'), createNotification);

module.exports = router;
