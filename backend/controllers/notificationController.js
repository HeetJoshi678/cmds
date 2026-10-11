const Notification = require('../models/Notification');
const User = require('../models/User');

// 1. Get notifications for the logged-in user
const getNotifications = async (req, res) => {
  const { role, loginId } = req.user;

  try {
    // Retrieve all notifications and filter programmatically for DB-engine compatibility
    const allNotifications = await Notification.find({});
    
    const userNotifications = allNotifications.filter(n => {
      if (n.targetRole === 'All') return true;
      if (n.targetRole === role) {
        return !n.targetUserId || n.targetUserId === loginId;
      }
      return false;
    });

    // Sort by newest first
    userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userNotifications);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving notifications.', error: error.message });
  }
};

// 2. Mark a notification as read
const markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json({ message: 'Notification marked as read.', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification status.', error: error.message });
  }
};

// 3. Create a custom notification/announcement (Teacher / Principal only)
const createNotification = async (req, res) => {
  const { targetRole, targetUserId, message, type } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    // Verify target user if specified
    if (targetUserId) {
      const targetUser = await User.findOne({ loginId: targetUserId });
      if (!targetUser) {
        return res.status(404).json({ message: `Target User ID '${targetUserId}' does not exist.` });
      }
    }

    const newNotification = await Notification.create({
      targetRole: targetRole || 'All',
      targetUserId: targetUserId || undefined,
      message,
      type: type || 'announcement'
    });

    // Notify connected WebSockets if Socket.io is active
    if (req.io) {
      const room = targetUserId ? `user_${targetUserId}` : `role_${targetRole || 'All'}`;
      req.io.to(room).emit('new_notification', newNotification);
      if (targetRole === 'All') {
        req.io.emit('new_notification', newNotification); // broadcast to all
      }
    }

    res.status(201).json({ message: 'Announcement published successfully.', data: newNotification });
  } catch (error) {
    res.status(500).json({ message: 'Error publishing announcement.', error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  createNotification
};
