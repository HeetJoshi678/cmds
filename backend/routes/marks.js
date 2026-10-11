const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getStudentMarks,
  getAllMarks,
  addMark,
  editMark,
  downloadTemplate,
  bulkUpload,
  getPassFailStats,
  getLeaderboard,
  scaleMaxMarks
} = require('../controllers/marksController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage
});

// Student view own grades, anyone can view leaderboard
router.get('/student/:studentId', protect, getStudentMarks);
router.get('/leaderboard', protect, getLeaderboard);

// Grade management (restricted to Teacher/Principal)
router.get('/', protect, authorize('Teacher', 'Principal'), getAllMarks);
router.get('/stats', protect, authorize('Teacher', 'Principal'), getPassFailStats);

// Teacher-only modification routes
router.post('/', protect, authorize('Teacher'), addMark);
router.put('/scale-max-marks', protect, authorize('Teacher'), scaleMaxMarks);
router.put('/:id', protect, authorize('Teacher'), editMark);
router.get('/template', protect, authorize('Teacher'), downloadTemplate);
router.post('/upload', protect, authorize('Teacher'), upload.single('file'), bulkUpload);

module.exports = router;
