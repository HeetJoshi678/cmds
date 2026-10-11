const { getDBEngine } = require('../config/db');
const db = getDBEngine();

const gtuResultSchema = new db.Schema({
  studentId: { type: String, required: true },       // Roll Number / Enrollment Number (e.g. S1, 123)
  enrollmentNo: { type: String },                    // Enrollment Number
  semester: { type: String, required: true },         // e.g. "Semester 1", "Semester 3"
  subjectCode: { type: String, default: 'GTU101' },   // e.g. "3110005"
  subjectName: { type: String, required: true },      // e.g. "Physics", "Programming in C"
  gtuMarks: { type: Number, required: true },         // GTU score obtained
  maxMarks: { type: Number, default: 70 },           // GTU max marks (default 70)
  gtuGrade: { type: String, default: 'AA' },          // e.g. "AA", "AB", "BB", "BC", "CC", "CD", "DD", "FF"
  resultStatus: { type: String, default: 'PASS' },    // "PASS" or "FAIL"
  uploadedBy: { type: String, required: true },       // Employee ID of teacher
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = db.model('GTUResult', gtuResultSchema);
