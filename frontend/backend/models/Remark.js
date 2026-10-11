const { getDBEngine } = require('../config/db');
const db = getDBEngine();

const remarkSchema = new db.Schema({
  studentId: { type: String, required: true },     // target student loginId (Roll Number)
  teacherId: { type: String, required: true },     // teacher loginId (Employee ID)
  teacherName: { type: String, required: true },   // cached teacher name for display
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = db.model('Remark', remarkSchema);
