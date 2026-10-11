const GTUResult = require('../models/GTUResult');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
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

// Calculate GTU Grade automatically if not provided (default out of 70)
const calculateGTUGrade = (marks, max = 70) => {
  const pct = (Number(marks) / Number(max)) * 100;
  if (pct >= 85) return 'AA';
  if (pct >= 75) return 'AB';
  if (pct >= 65) return 'BB';
  if (pct >= 55) return 'BC';
  if (pct >= 45) return 'CC';
  if (pct >= 40) return 'CD';
  if (pct >= 33) return 'DD';
  return 'FF';
};

// 1. Manually Add or Update GTU Result (Teacher only)
const addManualGTUResult = async (req, res) => {
  const { 
    studentId, enrollmentNo, semester, subjectCode, subjectName, 
    gtuMarks, maxMarks, gtuGrade, resultStatus 
  } = req.body;

  try {
    if (!studentId || !subjectName || gtuMarks === undefined || gtuMarks === '') {
      return res.status(400).json({ message: 'Student ID, Subject Name, and GTU Marks are required.' });
    }

    let cleanId = studentId.toString().trim();
    if (!cleanId.toUpperCase().startsWith('S') && !cleanId.toUpperCase().startsWith('IML') && !isNaN(cleanId)) {
      cleanId = 'S' + cleanId;
    }

    // Verify or auto-create student profile if missing
    let student = await User.findOne({ loginId: cleanId, role: 'Student' });
    if (!student) {
      student = await User.create({
        name: req.body.studentName || `Student ${cleanId}`,
        loginId: cleanId,
        role: 'Student',
        classOrSubject: 'Class A',
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanId}`
      });
    }

    const max = Number(maxMarks || 70);
    const score = Number(gtuMarks);
    const grade = gtuGrade || calculateGTUGrade(score, max);
    const status = resultStatus || (score / max * 100 >= 33 ? 'PASS' : 'FAIL');
    const targetSem = semester || 'Semester 1';
    const targetCode = subjectCode || 'GTU101';

    // Upsert GTU Result for student + subjectName + semester
    const existing = await GTUResult.findOne({ 
      studentId: cleanId, 
      subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') }, 
      semester: targetSem 
    });

    let gtuRecord;
    if (existing) {
      gtuRecord = await GTUResult.findByIdAndUpdate(
        existing._id,
        {
          gtuMarks: score,
          maxMarks: max,
          gtuGrade: grade,
          resultStatus: status,
          subjectCode: targetCode,
          enrollmentNo: enrollmentNo || cleanId,
          uploadedBy: req.user.loginId
        },
        { new: true }
      );
    } else {
      gtuRecord = await GTUResult.create({
        studentId: cleanId,
        enrollmentNo: enrollmentNo || cleanId,
        semester: targetSem,
        subjectCode: targetCode,
        subjectName,
        gtuMarks: score,
        maxMarks: max,
        gtuGrade: grade,
        resultStatus: status,
        uploadedBy: req.user.loginId
      });
    }

    // Audit Log & Notification
    await logActivity(
      req.user.loginId,
      req.user.name,
      req.user.role,
      'Add GTU Result',
      `Added GTU Result for ${student.name} (${cleanId}) in ${subjectName}: ${score}/${max} (${grade})`
    );

    await Notification.create({
      targetRole: 'Student',
      targetUserId: cleanId,
      message: `GTU Result updated for ${subjectName} (${targetSem}): Score ${score}/${max} (${grade}).`,
      type: 'marks'
    });

    res.status(201).json({ message: 'GTU result saved successfully.', data: gtuRecord });
  } catch (error) {
    res.status(500).json({ message: 'Error saving GTU result.', error: error.message });
  }
};

// 2. Edit existing GTU Result (Teacher only)
const editGTUResult = async (req, res) => {
  const { id } = req.params;
  const { gtuMarks, maxMarks, gtuGrade, resultStatus, semester, subjectCode, subjectName } = req.body;

  try {
    const record = await GTUResult.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'GTU result entry not found.' });
    }

    const max = maxMarks !== undefined ? Number(maxMarks) : (record.maxMarks || 70);
    const score = gtuMarks !== undefined ? Number(gtuMarks) : record.gtuMarks;
    const grade = gtuGrade || calculateGTUGrade(score, max);
    const status = resultStatus || (score / max * 100 >= 33 ? 'PASS' : 'FAIL');

    const updated = await GTUResult.findByIdAndUpdate(
      id,
      {
        gtuMarks: score,
        maxMarks: max,
        semester: semester !== undefined ? semester : record.semester,
        subjectCode: subjectCode !== undefined ? subjectCode : record.subjectCode,
        subjectName: subjectName !== undefined ? subjectName : record.subjectName,
        gtuGrade: grade,
        resultStatus: status,
        uploadedBy: req.user.loginId
      },
      { new: true }
    );

    await logActivity(
      req.user.loginId,
      req.user.name,
      req.user.role,
      'Edit GTU Result',
      `Updated GTU result for ${record.studentId} in ${subjectName || record.subjectName}`
    );

    res.json({ message: 'GTU result updated successfully.', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error editing GTU result.', error: error.message });
  }
};

// 3. Get GTU Results for Student
const getGTUResultsByStudent = async (req, res) => {
  const { studentId } = req.params;

  try {
    let cleanId = studentId.toString().trim();
    if (!cleanId.toUpperCase().startsWith('S') && !cleanId.toUpperCase().startsWith('IML') && !isNaN(cleanId)) {
      cleanId = 'S' + cleanId;
    }

    const results = await GTUResult.find({ 
      $or: [
        { studentId: cleanId },
        { studentId: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { enrollmentNo: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching GTU results.', error: error.message });
  }
};

// 4. Intelligent GTU Excel Import with Student Auto-Registration
const uploadGTUExcel = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No Excel file uploaded.' });
  }

  const filePath = req.file.path;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData || rawData.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'Uploaded Excel sheet is empty.' });
    }

    let updatedCount = 0;
    let createdCount = 0;
    const failedRecords = [];

    const normalize = str => str.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index];
      const rowNum = index + 2;
      const rowKeys = Object.keys(row);

      if (rowKeys.length === 0) continue;

      // Existing project column matching criteria
      const rollKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('enroll') || norm.includes('roll') || norm === 'id' || norm === 'studentid' || norm.includes('reg') || norm.includes('slno') || norm.includes('srno');
      }) || rowKeys[0];

      const nameKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('name') || norm.includes('studentname');
      });

      const subjectNameKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('subjectname') || norm.includes('subject') || norm.includes('course') || norm.includes('title');
      });

      // Detect if column header or sheet name has subject (e.g. Minor Project)
      let columnInferredSubject = '';
      const projKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('minorproject') || norm.includes('project');
      });
      if (projKey) {
        columnInferredSubject = 'Minor Project';
      }
      if (!columnInferredSubject && normalize(sheetName).includes('minorproject')) {
        columnInferredSubject = 'Minor Project';
      }

      const subjectCodeKey = rowKeys.find(k => {
        const norm = normalize(k);
        return norm.includes('code') || norm.includes('subjectcode') || norm.includes('subcode');
      });

      const semesterKey = rowKeys.find(k => normalize(k).includes('sem'));

      const marksKey = rowKeys.find(k => {
        const norm = normalize(k);
        return (norm.includes('gtu') || norm.includes('mark') || norm.includes('score') || norm.includes('point') || norm.includes('total') || norm.includes('result') || norm.includes('obtained')) &&
               !norm.includes('max') && !norm.includes('outof') && !norm.includes('roll') && !norm.includes('name') && !norm.includes('sem') && !norm.includes('code') && !norm.includes('status');
      }) || rowKeys.find(k => normalize(k).includes('mark') || normalize(k).includes('score'));

      const gradeKey = rowKeys.find(k => normalize(k).includes('grade'));
      const statusKey = rowKeys.find(k => normalize(k).includes('status') || normalize(k).includes('pass'));
      const maxMarksKey = rowKeys.find(k => normalize(k).includes('max') || normalize(k).includes('outof'));

      let rawRoll = rollKey ? row[rollKey] : null;
      let rollNumber = null;
      if (rawRoll !== null && rawRoll !== undefined && rawRoll !== '') {
        let clean = rawRoll.toString().trim();
        if (!clean.toUpperCase().startsWith('S') && !clean.toUpperCase().startsWith('IML') && !isNaN(clean)) {
          rollNumber = 'S' + clean;
        } else {
          rollNumber = clean;
        }
      }

      const studentName = nameKey ? row[nameKey].toString().trim() : null;
      const subjectName = subjectNameKey 
        ? row[subjectNameKey].toString().trim() 
        : (req.body.subject || req.body.subjectName || columnInferredSubject || req.user?.classOrSubject || 'Minor Project');

      const defaultCode = subjectName === 'Minor Project' ? '3160001' : 'GTU101';
      const subjectCode = subjectCodeKey 
        ? row[subjectCodeKey].toString().trim() 
        : (req.body.subjectCode || defaultCode);

      const semester = req.body.semester || (semesterKey ? row[semesterKey].toString().trim() : null) || 'Semester 1';
      const marksValStr = marksKey !== undefined ? row[marksKey] : undefined;

      // GTU default is strictly out of 70
      let maxMarks = 70;
      if (req.body.defaultMaxMarks && Number(req.body.defaultMaxMarks) > 0) {
        maxMarks = Number(req.body.defaultMaxMarks);
      }
      if (maxMarksKey && row[maxMarksKey] !== undefined && row[maxMarksKey] !== null && row[maxMarksKey] !== '') {
        maxMarks = Number(row[maxMarksKey]);
      }

      // Validations
      if (!rollNumber) {
        failedRecords.push({ row: rowNum, rollNumber: 'N/A', name: studentName || 'N/A', reason: 'Missing Roll / Enrollment Number.' });
        continue;
      }

      if (marksValStr === undefined || marksValStr === '') {
        failedRecords.push({ row: rowNum, rollNumber, name: studentName || 'N/A', reason: 'Missing GTU Marks value.' });
        continue;
      }

      const score = Number(marksValStr);
      if (isNaN(score) || score < 0) {
        failedRecords.push({ row: rowNum, rollNumber, name: studentName || 'N/A', reason: `Invalid GTU Marks: '${marksValStr}'. Must be >= 0.` });
        continue;
      }

      // Check if student exists or auto-register
      let student = await User.findOne({ loginId: rollNumber, role: 'Student' });
      if (student) {
        updatedCount++;
      } else {
        student = await User.create({
          name: studentName || `Student ${rollNumber}`,
          loginId: rollNumber,
          role: 'Student',
          classOrSubject: 'Class A',
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${rollNumber}`
        });
        createdCount++;
      }

      const grade = gradeKey && row[gradeKey] ? row[gradeKey].toString().trim().toUpperCase() : calculateGTUGrade(score, maxMarks);
      const status = statusKey && row[statusKey] ? row[statusKey].toString().trim().toUpperCase() : (score / maxMarks * 100 >= 40 ? 'PASS' : 'FAIL');

      // Upsert GTU Result
      const existingRecord = await GTUResult.findOne({
        studentId: rollNumber,
        subjectName: { $regex: new RegExp(`^${subjectName}$`, 'i') },
        semester
      });

      if (existingRecord) {
        await GTUResult.findByIdAndUpdate(existingRecord._id, {
          gtuMarks: score,
          maxMarks,
          gtuGrade: grade,
          resultStatus: status,
          subjectCode,
          subjectName,
          uploadedBy: req.user.loginId
        });
      } else {
        await GTUResult.create({
          studentId: rollNumber,
          enrollmentNo: rollNumber,
          semester,
          subjectCode,
          subjectName,
          gtuMarks: score,
          maxMarks,
          gtuGrade: grade,
          resultStatus: status,
          uploadedBy: req.user.loginId
        });
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Log Activity
    await logActivity(
      req.user.loginId,
      req.user.name,
      req.user.role,
      'Upload GTU Excel',
      `Imported GTU Excel sheet: ${updatedCount} updated, ${createdCount} new registered, ${failedRecords.length} failed.`
    );

    res.json({
      message: 'GTU Excel Import Completed',
      summary: {
        updatedCount,
        createdCount,
        failedCount: failedRecords.length,
        totalProcessed: rawData.length
      },
      failedRecords
    });
  } catch (error) {
    console.error('GTU Excel Processing Error:', error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ message: 'Error processing GTU Excel file: ' + error.message, error: error.message });
  }
};

// 5. Weightage Settings (Configurable Internal vs GTU Weightage)
let weightageSettings = { internalWeight: 30, gtuWeight: 70 };

const getGTUSettings = async (req, res) => {
  res.json(weightageSettings);
};

const updateGTUSettings = async (req, res) => {
  const { internalWeight, gtuWeight } = req.body;
  if (internalWeight !== undefined) weightageSettings.internalWeight = Number(internalWeight);
  if (gtuWeight !== undefined) weightageSettings.gtuWeight = Number(gtuWeight);
  res.json({ message: 'GTU weightage settings updated.', settings: weightageSettings });
};

module.exports = {
  addManualGTUResult,
  editGTUResult,
  getGTUResultsByStudent,
  uploadGTUExcel,
  getGTUSettings,
  updateGTUSettings
};
