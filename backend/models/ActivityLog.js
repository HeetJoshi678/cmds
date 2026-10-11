const { getDBEngine } = require('../config/db');
const db = getDBEngine();

const activityLogSchema = new db.Schema({
  userId: { type: String, required: true },     // loginId of user (Teacher / Principal)
  userName: { type: String, required: true },   // name of the user
  userRole: { type: String, required: true },   // role of the user (e.g. Teacher)
  action: { type: String, required: true },     // e.g. "Upload Marks", "Edit Marks", "Deactivate Teacher"
  details: { type: String, required: true },    // Description e.g., "Uploaded Midterm marks for math in Semester 1"
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = db.model('ActivityLog', activityLogSchema);
