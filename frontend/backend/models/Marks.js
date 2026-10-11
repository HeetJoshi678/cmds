const { getDBEngine } = require('../config/db');
const db = getDBEngine();

const marksSchema = new db.Schema({
  studentId: { type: String, required: true },     // references User._id or loginId (Roll Number)
  subject: { type: String, required: true },
  examType: { type: String, required: true },       // e.g. "Midterm", "Final", "Assignment"
  marksObtained: { type: Number, required: true },
  maxMarks: { type: Number, required: true, default: 100 },
  semester: { type: String, required: true },       // e.g. "Semester 1", "Semester 2", etc.
  uploadedBy: { type: String, required: true },     // Employee ID of the teacher who uploaded it
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = db.model('Marks', marksSchema);
