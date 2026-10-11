const { getDBEngine } = require('../config/db');
const db = getDBEngine();

const userSchema = new db.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Principal'] },
  loginId: { type: String, required: true, unique: true },
  avatarUrl: { type: String },
  classOrSubject: { type: String }, // "Class A", "Class B", etc. for students; teaching subject for teachers
  dob: { type: String },            // Date of Birth (e.g. "06/07/2008" or "2008-07-06")
  password: { type: String }       // Custom password (e.g. "heet0678")
}, { timestamps: true });

module.exports = db.model('User', userSchema);
