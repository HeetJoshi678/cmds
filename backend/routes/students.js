const express = require('express');
const {
  getStudents,
  getStudentById,
  addRemark,
  createStudent,
  updateStudent,
  deleteStudent,
  getActivityLogs,
  getTeachers,
  createTeacher,
  deleteTeacher,
  getDatabaseExplorer
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// General Student Search / Detail lookups
router.get('/', protect, authorize('Teacher', 'Principal'), getStudents);
router.get('/profile/:id', protect, getStudentById);

// Teacher-only Student Management and Remarks
router.post('/remark', protect, authorize('Teacher'), addRemark);
router.post('/', protect, authorize('Teacher'), createStudent);
router.put('/:id', protect, authorize('Teacher'), updateStudent);
router.delete('/:id', protect, authorize('Teacher'), deleteStudent);

// Principal Audits, Faculty Management & Database Explorer
router.get('/logs', protect, authorize('Principal'), getActivityLogs);
router.get('/teachers', protect, authorize('Principal'), getTeachers);
router.post('/teachers', protect, authorize('Principal'), createTeacher);
router.delete('/teachers/:id', protect, authorize('Principal'), deleteTeacher);
router.get('/database-explorer', protect, authorize('Principal'), getDatabaseExplorer);

module.exports = router;
