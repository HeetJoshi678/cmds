const Marks = require('../models/Marks');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { isMock } = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');

// Helper to log teacher activities
const logActivity = async (userId, userName, userRole, action, details) => {
  try {
    await ActivityLog.create({ userId, userName, userRole, action, details });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// 1. Get student marks (Student Panel)
const getStudentMarks = async (req, res) => {
  const { studentId } = req.params;

  try {
    // If student is querying, ensure they only access their own profile
    if (req.user.role === 'Student' && req.user.loginId !== studentId) {
      return res.status(403).json({ message: 'Forbidden: You can only view your own marks.' });
    }

    const marks = await Marks.find({ studentId });
    res.json(marks);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving marks.', error: error.message });
  }
};

// 2. Search and filter student marks (Teacher / Principal Panel)
const getAllMarks = async (req, res) => {
  const { studentId, subject, semester } = req.query;
  const filter = {};

  if (studentId) filter.studentId = studentId;
  if (subject) filter.subject = { $regex: new RegExp(subject, 'i') };
  if (semester) filter.semester = semester;

  try {
    const marks = await Marks.find(filter);
    res.json(marks);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving marks list.', error: error.message });
  }
};

// 3. Manually add a student mark (Teacher only)
const addMark = async (req, res) => {
  const { studentId, subject, examType, marksObtained, maxMarks, semester } = req.body;

  try {
    // Verify student exists
    const student = await User.findOne({ loginId: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({ message: `No student found with Roll Number: ${studentId}` });
    }

    const newMark = await Marks.create({
      studentId,
      subject,
      examType,
      marksObtained: Number(marksObtained),
      maxMarks: Number(maxMarks || 100),
      semester,
      uploadedBy: req.user.loginId
    });

    // Audit Log
    await logActivity(
      req.user.loginId,
      req.user.name,
      req.user.role,
      'Add Mark',
      `Manually added marks for ${student.name} (${studentId}) in ${subject}: ${marksObtained}/${maxMarks}`
    );

    // Create Notification
    await Notification.create({
      targetRole: 'Student',
      targetUserId: studentId,
      message: `New marks uploaded for ${subject} (${examType}): ${marksObtained}/${maxMarks}.`,
      type: 'marks'
    });

    res.status(201).json({ message: 'Mark added successfully.', data: newMark });
  } catch (error) {
    res.status(500).json({ message: 'Error adding mark.', error: error.message });
  }
};

// 4. Manually edit student marks (Teacher only)
const editMark = async (req, res) => {
  const { id } = req.params;
  const { marksObtained, maxMarks, examType, semester, subject } = req.body;

  try {
    const existingMark = await Marks.findById(id);
    if (!existingMark) {
      return res.status(404).json({ message: 'Mark record not found.' });
    }

    const updated = await Marks.findByIdAndUpdate(
      id,
      {
        marksObtained: Number(marksObtained),
        maxMarks: Number(maxMarks),
        examType,
        semester,
        subject
      },
      { new: true }
    );

    // Fetch student name for the log
    const student = await User.findOne({ loginId: existingMark.studentId, role: 'Student' });
    const studentName = student ? student.name : existingMark.studentId;

    // Audit Log
    await logActivity(
      req.user.loginId,
      req.user.name,
      req.user.role,
      'Edit Mark',
      `Modified marks for ${studentName} (${existingMark.studentId}) in ${existingMark.subject}: ${existingMark.marksObtained} -> ${marksObtained}`
    );

    // Notify student
    await Notification.create({
      targetRole: 'Student',
      targetUserId: existingMark.studentId,
      message: `Marks updated for ${existingMark.subject} (${examType}): ${marksObtained}/${maxMarks}.`,
      type: 'marks'
    });

    res.json({ message: 'Mark updated successfully.', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating mark.', error: error.message });
  }
};

// 5. Download template for bulk upload (Teacher only)
const downloadTemplate = (req, res) => {
  const format = req.query.format || 'csv';

  try {
    const headers = ['RollNumber', 'Subject', 'ExamType', 'MarksObtained', 'MaxMarks', 'Semester'];
    const sampleData = [
      {
        RollNumber: 'S101',
        Subject: 'Mathematics',
        ExamType: 'Midterm',
        MarksObtained: 85,
        MaxMarks: 100,
        Semester: 'Semester 1'
      },
      {
        RollNumber: 'S102',
        Subject: 'Mathematics',
        ExamType: 'Midterm',
        MarksObtained: 38,
        MaxMarks: 100,
        Semester: 'Semester 1'
      }
    ];

    if (format === 'xlsx') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(sampleData, { header: headers });
      xlsx.utils.book_append_sheet(wb, ws, 'Marks Template');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=marks_upload_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buf);
    } else {
      // Return CSV format
      const csvContent = [
        headers.join(','),
        ...sampleData.map(row => `${row.RollNumber},${row.Subject},${row.ExamType},${row.MarksObtained},${row.MaxMarks},"${row.Semester}"`)
      ].join('\n');

      res.setHeader('Content-Disposition', 'attachment; filename=marks_upload_template.csv');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvContent);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating template file.', error: error.message });
  }
};

// 6. Bulk Upload Marks (Teacher only)
const bulkUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CSV or Excel file.' });
  }

  console.log('📂 File Upload Attempt:');
  console.log('- Original Name:', req.file.originalname);
  console.log('- Mime Type:', req.file.mimetype);
  console.log('- Saved Path:', req.file.path);

  const filePath = req.file.path;
  const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
  
  try {
    let rows = [];

    // Parse XLSX / XLS
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(worksheet);
    } 
    // Parse CSV (read file and convert simple CSV lines)
    else if (fileExtension === 'csv') {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const lines = fileData.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          if (currentLine.length === headers.length) {
            const rowObj = {};
            headers.forEach((h, index) => {
              rowObj[h] = currentLine[index];
            });
            rows.push(rowObj);
          }
        }
      }
    } else {
      return res.status(400).json({ message: 'Unsupported file format. Please upload .csv or .xlsx' });
    }

    // Clean uploaded file
    try { fs.unlinkSync(filePath); } catch (e) {}

    if (rows.length === 0) {
      return res.status(400).json({ message: 'The uploaded file contains no data rows.' });
    }

    const errors = [];
    const validRows = [];
    const studentCache = {}; // Cache to prevent double fetching

    // Validate rows
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2; // header is row 1

      const rowKeys = Object.keys(row);

      // Skip empty or blank trailing spreadsheet rows
      const hasContent = rowKeys.some(k => {
        const val = row[k];
        return val !== undefined && val !== null && String(val).trim() !== '';
      });
      if (!hasContent) {
        continue;
      }
      // Smart Column Header Detection
      const normalize = (s) => (s || '').toString().toLowerCase().replace(/[\s_.-]/g, '');

      // 1. Roll Number Key
      const rollKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('roll') || norm === 'id' || norm === 'studentid' || norm.includes('enroll') || norm.includes('reg') || norm.includes('slno') || norm.includes('srno');
      }) || rowKeys[0]; // Fallback to 1st column

      // 2. Max Marks Key (specifically look for max/maximum/outof)
      const maxMarksKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('max') || norm.includes('outof');
      });

      // 3. Name / Subject / Exam / Semester Keys
      const nameKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('name') || norm.includes('studentname');
      });
      const subjectKey = rowKeys.find(k => normalize(k).includes('subject') || normalize(k).includes('course'));
      const examTypeKey = rowKeys.find(k => normalize(k).includes('exam') || normalize(k).includes('test'));
      const semesterKey = rowKeys.find(k => normalize(k).includes('sem'));

      // 4. Marks Obtained Key (Excluding roll, name, subject, exam, semester, and max marks keys)
      let marksKey = rowKeys.find(k => {
        const norm = normalize(k);
        return (norm.includes('obtained') || norm.includes('mark') || norm.includes('score') || norm.includes('point') || norm.includes('total') || norm.includes('result') || norm.includes('mse') || norm.includes('ese') || norm.includes('internal')) &&
               !norm.includes('max') && !norm.includes('outof') && !norm.includes('roll') && !norm.includes('name') && !norm.includes('subject') && !norm.includes('sem');
      });

      // Fallback 1 for Marks Key: Any remaining key with 'marks' or 'score' not equal to maxMarksKey
      if (!marksKey) {
        marksKey = rowKeys.find(k => {
          const norm = normalize(k);
          return (norm.includes('mark') || norm.includes('score')) && k !== maxMarksKey;
        });
      }

      // Fallback 2 for Marks Key: First non-metadata column containing a numeric value
      if (!marksKey) {
        marksKey = rowKeys.find(k => {
          if (k === rollKey || k === nameKey || k === subjectKey || k === examTypeKey || k === semesterKey || k === maxMarksKey) return false;
          const val = row[k];
          return val !== undefined && val !== null && val !== '' && !isNaN(Number(val));
        });
      }

      let rawRoll = rollKey ? row[rollKey] : null;
      let rollNumber = null;
      if (rawRoll !== null && rawRoll !== undefined) {
        let clean = rawRoll.toString().trim();
        if (!clean.toUpperCase().startsWith('S') && !clean.toUpperCase().startsWith('IML') && !isNaN(clean)) {
          rollNumber = 'S' + clean;
        } else {
          rollNumber = clean;
        }
      }

      const subject = (req.user && req.user.classOrSubject) || (subjectKey ? row[subjectKey] : null) || req.body.subject || 'Minor Project';
      const examType = (examTypeKey ? row[examTypeKey] : null) || req.body.examType || 'Midterm';
      const semester = req.body.semester || (semesterKey ? row[semesterKey] : null) || 'Semester 1';
      const marksObtainedStr = marksKey !== undefined ? row[marksKey] : undefined;

      let maxMarks = req.body.defaultMaxMarks ? Number(req.body.defaultMaxMarks) : 100;
      if (maxMarksKey && row[maxMarksKey] !== undefined && row[maxMarksKey] !== null && row[maxMarksKey] !== '') {
        maxMarks = Number(row[maxMarksKey]);
      } else if (marksKey) {
        // Extract max marks from header string like "Marks (Out of 30)" or "Score/30"
        let match = marksKey.match(/out\s+of\s+(\d+)/i) || marksKey.match(/\/(\d+)/) || marksKey.match(/\((\d+)\)/);
        if (match) {
          maxMarks = Number(match[1]);
        }
      }

      if (!rollNumber) {
        errors.push({ row: rowNum, message: 'Missing Roll Number (could not find Roll No / RollNumber column).' });
        continue;
      }
      if (!subject) {
        errors.push({ row: rowNum, message: 'Missing Subject.' });
        continue;
      }
      if (!examType) {
        errors.push({ row: rowNum, message: 'Missing Exam Type.' });
        continue;
      }
      if (marksObtainedStr === undefined || marksObtainedStr === '') {
        errors.push({ row: rowNum, message: 'Missing Marks Obtained.' });
        continue;
      }
      if (!semester) {
        errors.push({ row: rowNum, message: 'Missing Semester.' });
        continue;
      }

      const marksObtained = Number(marksObtainedStr);

      if (isNaN(marksObtained) || marksObtained < 0) {
        errors.push({ row: rowNum, message: `Invalid Marks Obtained value: '${marksObtainedStr}'. Must be >= 0.` });
        continue;
      }
      if (isNaN(maxMarks) || maxMarks <= 0) {
        errors.push({ row: rowNum, message: `Invalid Max Marks value: '${maxMarksStr}'. Must be > 0.` });
        continue;
      }
      if (marksObtained > maxMarks) {
        errors.push({ row: rowNum, message: `Marks Obtained (${marksObtained}) exceeds Max Marks (${maxMarks}).` });
        continue;
      }

      // Check student existence
      let student = studentCache[rollNumber];
      if (student === undefined) {
        student = await User.findOne({ loginId: rollNumber, role: 'Student' });
        studentCache[rollNumber] = student || null;
      }

      if (!student) {
        // Dynamically register unregistered students from the sheet
        const studentNameKey = rowKeys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('student'));
        const studentName = (studentNameKey ? row[studentNameKey] : null) || `Student ${rollNumber}`;
        
        student = await User.create({
          name: studentName,
          loginId: rollNumber,
          role: 'Student',
          classOrSubject: req.user.classOrSubject || 'Class A',
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(studentName)}`
        });
        
        studentCache[rollNumber] = student;
        console.log(`🌱 Dynamically registered new student: ${studentName} (${rollNumber})`);
      }

      validRows.push({
        studentId: rollNumber,
        subject,
        examType,
        marksObtained,
        maxMarks,
        semester,
        uploadedBy: req.user.loginId
      });
    }

    // If there are errors, stop and report them
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Bulk upload validation failed. Correct row issues and re-upload.',
        errors
      });
    }

    // Upsert marks (update existing if studentId + subject + examType match, or insert)
    const dbMock = require('../utils/dbMock');
    const allMarks = dbMock.readFile('markss');
    for (const item of validRows) {
      const idx = allMarks.findIndex(m => m.studentId === item.studentId && m.subject === item.subject && m.examType === item.examType);
      if (idx !== -1) {
        allMarks[idx] = {
          ...allMarks[idx],
          ...item,
          updatedAt: new Date().toISOString()
        };
      } else {
        allMarks.push({
          _id: Math.random().toString(36).substring(2, 11),
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    dbMock.writeFile('markss', allMarks);

    // Audit Log
    await logActivity(
      req.user.loginId,
      req.user.name,
      req.user.role,
      'Bulk Upload Marks',
      `Bulk uploaded ${validRows.length} grade entries from file ${req.file.originalname}`
    );

    // Notify students (create system wide notifications or targeted notifications)
    // We can compile a set of students to notify
    const uniqueStudents = [...new Set(validRows.map(r => r.studentId))];
    for (const studId of uniqueStudents) {
      await Notification.create({
        targetRole: 'Student',
        targetUserId: studId,
        message: 'New grade records have been uploaded for your classes.',
        type: 'marks'
      });
    }

    res.status(201).json({
      message: `Successfully uploaded ${validRows.length} marks entries.`,
      count: validRows.length
    });

  } catch (error) {
    // Make sure temp file is cleaned up on error
    try { fs.unlinkSync(filePath); } catch (e) {}
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: 'Error processing bulk upload file.', error: error.message });
  }
};

// 7. Get pass-fail statistics and averages (Teacher & Principal Dashboard)
const getPassFailStats = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'Teacher') {
      const teacherSubject = (req.user.classOrSubject || '').trim();
      query = {
        $or: [
          { uploadedBy: req.user.loginId },
          { subject: { $regex: new RegExp(`^${teacherSubject}$`, 'i') } }
        ]
      };
    }

    const marks = await Marks.find(query);
    
    // Group marks by Student ID to compute per-student overall pass/fail status
    const studentAggregates = {}; // { studentId: { sumObtained: 0, sumMax: 0 } }
    const subjectStats = {}; // { subjectName: { passCount: 0, failCount: 0, sumObtained: 0, sumMax: 0, count: 0 } }
    const semesterAverages = {}; // { semesterName: { sumPct: 0, count: 0 } }

    // If teacher has no marks uploaded yet, initialize their assigned subject entry
    if (req.user && req.user.role === 'Teacher' && marks.length === 0) {
      const assignedSubject = req.user.classOrSubject || 'General';
      subjectStats[assignedSubject] = { passCount: 0, failCount: 0, sumObtained: 0, sumMax: 0, count: 0 };
    }

    marks.forEach(m => {
      const pct = (m.marksObtained / m.maxMarks) * 100;
      const isPass = pct >= 40; // 40% threshold

      // Student aggregate
      if (!studentAggregates[m.studentId]) {
        studentAggregates[m.studentId] = { sumObtained: 0, sumMax: 0 };
      }
      studentAggregates[m.studentId].sumObtained += m.marksObtained;
      studentAggregates[m.studentId].sumMax += m.maxMarks;

      // Subject aggregate (Use teacher assigned subject name for teacher dashboard)
      const displaySubject = (req.user && req.user.role === 'Teacher' && req.user.classOrSubject)
        ? req.user.classOrSubject
        : m.subject;

      if (!subjectStats[displaySubject]) {
        subjectStats[displaySubject] = { passCount: 0, failCount: 0, sumObtained: 0, sumMax: 0, count: 0 };
      }
      const sub = subjectStats[displaySubject];
      if (isPass) sub.passCount++;
      else sub.failCount++;
      sub.sumObtained += m.marksObtained;
      sub.sumMax += m.maxMarks;
      sub.count++;

      // Semester aggregate
      if (!semesterAverages[m.semester]) {
        semesterAverages[m.semester] = { sumPct: 0, count: 0 };
      }
      semesterAverages[m.semester].sumPct += pct;
      semesterAverages[m.semester].count++;
    });

    // Compute Student-Level Pass vs Fail Counts (1 count per unique student!)
    let overallPass = 0;
    let overallFail = 0;

    Object.keys(studentAggregates).forEach(studId => {
      const agg = studentAggregates[studId];
      const overallStudentPct = agg.sumMax > 0 ? (agg.sumObtained / agg.sumMax) * 100 : 0;
      if (overallStudentPct >= 40) {
        overallPass++;
      } else {
        overallFail++;
      }
    });

    const subjectAnalytics = Object.keys(subjectStats).map(name => {
      const s = subjectStats[name];
      return {
        subject: name,
        pass: s.passCount,
        fail: s.failCount,
        passCount: s.passCount,
        failCount: s.failCount,
        averageScore: s.sumMax > 0 ? Math.round((s.sumObtained / s.sumMax) * 100) : 0,
        total: s.count
      };
    });

    const semesterTrend = Object.keys(semesterAverages).map(name => {
      const s = semesterAverages[name];
      return {
        semester: name,
        averagePct: Math.round(s.sumPct / s.count)
      };
    }).sort((a, b) => a.semester.localeCompare(b.semester));

    res.json({
      overall: {
        pass: overallPass,
        fail: overallFail,
        total: overallPass + overallFail,
        passRate: overallPass + overallFail > 0 ? Math.round((overallPass / (overallPass + overallFail)) * 100) : 0
      },
      subjectAnalytics,
      semesterTrend
    });

  } catch (error) {
    res.status(500).json({ message: 'Error retrieving analytics data.', error: error.message });
  }
};

// 8. Gamified Leaderboard of Top Performing Students (Gamification)
const getLeaderboard = async (req, res) => {
  try {
    const students = await User.find({ role: 'Student' });
    const marks = await Marks.find({});

    // Map grades by student
    const studentGrades = {}; // { studentId: [pct, pct, pct] }
    marks.forEach(m => {
      const pct = (m.marksObtained / m.maxMarks) * 100;
      if (!studentGrades[m.studentId]) {
        studentGrades[m.studentId] = [];
      }
      studentGrades[m.studentId].push(pct);
    });

    const leaderboard = students.map(student => {
      const grades = studentGrades[student.loginId] || [];
      const totalExams = grades.length;
      
      let averagePct = 0;
      let streakBadge = 'none'; // 'Consistent', 'Star', 'none'
      let performanceBadge = 'Bronze'; // 'Gold', 'Silver', 'Bronze', 'None'

      if (totalExams > 0) {
        averagePct = Math.round(grades.reduce((sum, val) => sum + val, 0) / totalExams);

        // Compute streak (e.g. all exams above 80%)
        const allHigh = grades.every(pct => pct >= 80);
        const hasA = grades.some(pct => pct >= 90);
        
        if (allHigh && totalExams >= 3) streakBadge = 'Consistent Flame 🔥';
        else if (hasA) streakBadge = 'Star Performer ⭐';

        if (averagePct >= 85) performanceBadge = 'Gold';
        else if (averagePct >= 70) performanceBadge = 'Silver';
        else if (averagePct >= 40) performanceBadge = 'Bronze';
        else performanceBadge = 'Need Support';
      }

      return {
        studentId: student.loginId,
        name: student.name,
        avatarUrl: student.avatarUrl,
        classOrSubject: student.classOrSubject,
        averagePct,
        totalExams,
        badge: performanceBadge,
        streak: streakBadge
      };
    })
    .filter(s => s.totalExams > 0) // Only include students with marks
    .sort((a, b) => b.averagePct - a.averagePct); // Sort descending

    res.json(leaderboard);

  } catch (error) {
    res.status(500).json({ message: 'Error retrieving leaderboard.', error: error.message });
  }
};

// 9. Batch update / scale Max Marks for existing marks (Teacher only)
const scaleMaxMarks = async (req, res) => {
  const { newMaxMarks, subject } = req.body;

  try {
    if (!newMaxMarks || isNaN(Number(newMaxMarks)) || Number(newMaxMarks) <= 0) {
      return res.status(400).json({ message: 'Valid Max Marks number is required (e.g. 30, 50, 100).' });
    }

    const targetMax = Number(newMaxMarks);
    const targetSubject = subject || req.user.classOrSubject;

    const dbMock = require('../utils/dbMock');
    const allMarks = dbMock.readFile('markss');
    let updatedCount = 0;

    allMarks.forEach(m => {
      if (m.uploadedBy === req.user.loginId || m.subject === targetSubject) {
        const oldMax = m.maxMarks || 100;
        const scaledObtained = Math.round((m.marksObtained / oldMax) * targetMax);
        m.marksObtained = Math.min(scaledObtained, targetMax);
        m.maxMarks = targetMax;
        updatedCount++;
      }
    });

    dbMock.writeFile('markss', allMarks);

    await logActivity(
      req.user.loginId,
      req.user.name,
      req.user.role,
      'Update Max Marks Scale',
      `Batch updated ${updatedCount} grade records max marks to Out of ${targetMax}`
    );

    res.json({
      message: `Successfully updated ${updatedCount} grade records to Out of ${targetMax}.`,
      updatedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error scaling max marks.', error: error.message });
  }
};

module.exports = {
  getStudentMarks,
  getAllMarks,
  addMark,
  editMark,
  downloadTemplate,
  bulkUpload,
  getPassFailStats,
  getLeaderboard,
  scaleMaxMarks
};
