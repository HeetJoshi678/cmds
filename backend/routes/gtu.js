const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  addManualGTUResult,
  editGTUResult,
  getGTUResultsByStudent,
  uploadGTUExcel,
  getGTUSettings,
  updateGTUSettings
} = require('../controllers/gtuController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Multer Upload Setup
const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Routes
router.post('/manual', protect, authorize('Teacher'), addManualGTUResult);
router.put('/manual/:id', protect, authorize('Teacher'), editGTUResult);
router.post('/upload', protect, authorize('Teacher'), upload.single('file'), uploadGTUExcel);
router.get('/student/:studentId', protect, getGTUResultsByStudent);
router.get('/settings', protect, getGTUSettings);
router.put('/settings', protect, authorize('Teacher', 'Principal'), updateGTUSettings);

module.exports = router;
