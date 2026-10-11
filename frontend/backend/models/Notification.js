const { getDBEngine } = require('../config/db');
const db = getDBEngine();

const notificationSchema = new db.Schema({
  targetRole: { type: String, enum: ['All', 'Student', 'Teacher', 'Principal'], default: 'All' },
  targetUserId: { type: String }, // Optional: set to a specific Roll Number or Employee ID
  message: { type: String, required: true },
  type: { type: String, enum: ['marks', 'alert', 'announcement', 'at-risk'], default: 'announcement' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = db.model('Notification', notificationSchema);
