const User = require('../models/User');
const Remarks = require('../models/Remark');
const Marks = require('../models/Marks');
const GTUResult = require('../models/GTUResult');
const ActivityLog = require('../models/ActivityLog');
const { getRecommendations } = require('../utils/aiEngine');

// 1. Get searchable/filterable student list (Teacher & Principal Panel)
const getStudents = async (req, res) => {
  const { name, rollNumber, className } = req.query;
  const filter = { role: 'Student' };

  if (name) {
    filter.name = { $regex: new RegExp(name, 'i') };
  }
  if (rollNumber) {
    filter.loginId = { $regex: new RegExp(rollNumber, 'i') };
  }
  if (className) {
    filter.classOrSubject = className;
  }

  try {
    const students = await User.find(filter);
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving student list.', error: error.message });
  }
};

// 2. Get student details by ID (including recommendations, remarks & GTU results)
const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const cleanId = (id || '').trim();
    // Case-insensitive lookup for Roll Number (e.g. iml001 vs IML001)
    const student = await User.findOne({ 
      loginId: { $regex: new RegExp(`^${cleanId}$`, 'i') }, 
      role: 'Student' 
    });

    if (!student) {
      return res.status(404).json({ message: `Student with Roll Number ${id} not found.` });
    }

    // Retrieve marks and remarks case-insensitively using student loginId or searched id
    const marks = await Marks.find({ 
      $or: [
        { studentId: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { studentId: { $regex: new RegExp(`^${student.loginId}$`, 'i') } }
      ]
    });

    const gtuResults = await GTUResult.find({
      $or: [
        { studentId: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { studentId: { $regex: new RegExp(`^${student.loginId}$`, 'i') } },
        { enrollmentNo: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    });

    const remarks = await Remarks.find({ 
      $or: [
        { studentId: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { studentId: { $regex: new RegExp(`^${student.loginId}$`, 'i') } }
      ]
    }).sort({ createdAt: -1 });

    const recommendations = await getRecommendations(student.name, marks);

    res.json({
      student: {
        _id: student._id,
        loginId: student.loginId,
        name: student.name,
        avatarUrl: student.avatarUrl,
        classOrSubject: student.classOrSubject,
        dob: student.dob,
        password: student.password || computeStudentPassword(student.name, student.dob)
      },
      marks,
      gtuResults,
      remarks,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving student profile.', error: error.message });
  }
};

// Helper to compute default name+dob password
const computeStudentPassword = (name, dob) => {
  if (!name || !dob) return undefined;
  const firstName = name.trim().split(' ')[0].toLowerCase();
  let day = '', month = '', year = '';

  if (dob.includes('-')) {
    const parts = dob.split('-');
    if (parts[0].length === 4) { // YYYY-MM-DD
      year = parts[0];
      month = parseInt(parts[1], 10).toString();
      day = parseInt(parts[2], 10).toString().padStart(2, '0');
    }
  } else {
    const parts = dob.trim().split(/[\/\s.]+/);
    if (parts.length >= 3) {
      day = parseInt(parts[0], 10).toString().padStart(2, '0');
      month = parseInt(parts[1], 10).toString();
      year = parts[2] || '';
    }
  }

  const lastYearDigit = year ? year.slice(-1) : '';
  return `${firstName}${day}${month}${lastYearDigit}`;
};

// 3. Add a remark to a student profile (Teacher only)
const addRemark = async (req, res) => {
  const { studentId, comment } = req.body;

  try {
    if (!studentId || !comment) {
      return res.status(400).json({ message: 'Please provide studentId and comment.' });
    }

    const student = await User.findOne({ loginId: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({ message: `Student Roll Number ${studentId} not found.` });
    }

    const remark = await Remarks.create({
      studentId,
      teacherId: req.user.loginId,
      teacherName: req.user.name,
      comment
    });

    // Log Activity
    await ActivityLog.create({
      userId: req.user.loginId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Add Remark',
      details: `Added academic review comment on ${student.name} (${studentId})'s profile.`
    });

    res.status(201).json({ message: 'Remark added successfully.', data: remark });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving student remark.', error: error.message });
  }
};

// ========================================================
// Teacher Student Management CRUD Actions
// ========================================================

// 4. Create Student (Teacher only)
const createStudent = async (req, res) => {
  const { name, loginId, classOrSubject, dob, password } = req.body;

  try {
    if (!name || !loginId) {
      return res.status(400).json({ message: 'Name and Roll Number are required.' });
    }

    const existing = await User.findOne({ loginId });
    if (existing) {
      return res.status(400).json({ message: `Roll Number ${loginId} is already registered.` });
    }

    const calcPassword = password || computeStudentPassword(name, dob);

    const newStudent = await User.create({
      name,
      loginId,
      role: 'Student',
      classOrSubject: classOrSubject || 'Class A',
      dob: dob || undefined,
      password: calcPassword || undefined,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
    });

    // Log Action
    await ActivityLog.create({
      userId: req.user.loginId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Create Student Account',
      details: `Registered new student profile: ${name} (${loginId}) with DOB ${dob || 'N/A'}`
    });

    res.status(201).json({ message: 'Student registered successfully.', data: newStudent });
  } catch (error) {
    res.status(500).json({ message: 'Server error registering student.', error: error.message });
  }
};

// 5. Update Student (Teacher only)
const updateStudent = async (req, res) => {
  const { id } = req.params; // loginId
  const { name, classOrSubject, dob, password } = req.body;

  try {
    const student = await User.findOne({ loginId: id, role: 'Student' });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const updatedName = name || student.name;
    const updatedDob = dob !== undefined ? dob : student.dob;
    const calcPassword = password || (updatedDob ? computeStudentPassword(updatedName, updatedDob) : student.password);

    const updated = await User.findByIdAndUpdate(
      student._id,
      {
        name: updatedName,
        classOrSubject: classOrSubject || student.classOrSubject,
        dob: updatedDob,
        password: calcPassword
      },
      { new: true }
    );

    // Log Action
    await ActivityLog.create({
      userId: req.user.loginId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Update Student Profile',
      details: `Modified student profile details for ${student.name} (${id})`
    });

    res.json({ message: 'Student profile updated.', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating student profile.', error: error.message });
  }
};

// 6. Delete Student (Teacher only)
const deleteStudent = async (req, res) => {
  const { id } = req.params; // loginId

  try {
    const student = await User.findOne({ loginId: id, role: 'Student' });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Delete student, grades, and remarks
    await User.deleteOne({ loginId: id, role: 'Student' });
    await Marks.deleteMany({ studentId: id });
    await Remarks.deleteMany({ studentId: id });

    // Log Action
    await ActivityLog.create({
      userId: req.user.loginId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Delete Student Account',
      details: `Permanently removed student profile ${student.name} (${id}) and cleared all grades.`
    });

    res.json({ message: 'Student profile and grades cleared successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting student account.', error: error.message });
  }
};

// ========================================================
// Principal Audits & Faculty Management
// ========================================================

// 7. View teacher activity logs (Principal audit)
const getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving activity logs.', error: error.message });
  }
};

// 8. Get all teacher profiles (Principal panel)
const getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'Teacher' });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teacher profiles.', error: error.message });
  }
};

// 9. Register a new teacher account (Principal panel)
const createTeacher = async (req, res) => {
  const { name, loginId, classOrSubject, assignedSemester } = req.body;

  try {
    if (!name || !loginId) {
      return res.status(400).json({ message: 'Teacher Name and Employee ID are required.' });
    }

    const existing = await User.findOne({ loginId });
    if (existing) {
      return res.status(400).json({ message: `Employee ID ${loginId} is already registered.` });
    }

    const targetSemester = assignedSemester || 'Semester 1';

    const newTeacher = await User.create({
      name,
      loginId,
      role: 'Teacher',
      classOrSubject: classOrSubject || 'General',
      assignedSemester: targetSemester,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
    });

    await ActivityLog.create({
      userId: req.user.loginId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Register Teacher Account',
      details: `Registered new faculty profile: ${name} (${loginId}) assigned to subject: ${classOrSubject || 'General'} (${targetSemester})`
    });

    res.status(201).json({ message: 'Teacher profile created successfully.', data: newTeacher });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating teacher profile.', error: error.message });
  }
};

// 10. Delete a teacher account (Principal panel)
const deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const teacher = await User.findOne({ loginId: id, role: 'Teacher' });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    await User.deleteOne({ loginId: id, role: 'Teacher' });

    await ActivityLog.create({
      userId: req.user.loginId,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'Remove Teacher Account',
      details: `Removed faculty profile: ${teacher.name} (${id})`
    });

    res.json({ message: 'Teacher profile removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error removing teacher profile.', error: error.message });
  }
};

// 11. Full Database Inspector endpoint (Principal only)
const getDatabaseExplorer = async (req, res) => {
  try {
    const dbMock = require('../utils/dbMock');
    const users = dbMock.readFile('users');
    const markss = dbMock.readFile('markss');
    const activitylogs = dbMock.readFile('activitylogs');
    const notifications = dbMock.readFile('notifications');
    const remarks = dbMock.readFile('remarks');

    res.json({
      summary: {
        usersCount: users.length,
        marksCount: markss.length,
        logsCount: activitylogs.length,
        notificationsCount: notifications.length,
        remarksCount: remarks.length
      },
      collections: {
        users,
        markss,
        activitylogs,
        notifications,
        remarks
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving database inspection data.', error: error.message });
  }
};

module.exports = {
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
};
