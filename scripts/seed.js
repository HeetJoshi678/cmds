const { connectDB } = require('../backend/config/db');
const User = require('../backend/models/User');
const Marks = require('../backend/models/Marks');
const Notification = require('../backend/models/Notification');
const Remark = require('../backend/models/Remark');
const ActivityLog = require('../backend/models/ActivityLog');

const seedData = async () => {
  try {
    console.log('🔄 Connecting to database for seeding (v2.1)...');
    await connectDB();

    console.log('🧹 Clearing old records...');
    await User.deleteMany({});
    await Marks.deleteMany({});
    await Notification.deleteMany({});
    await Remark.deleteMany({});
    await ActivityLog.deleteMany({});

    console.log('🌱 Seeding Core Role Profiles & Sample Students...');
    const users = [
      // Principal
      {
        name: 'Dean Arthur Pendelton',
        role: 'Principal',
        loginId: 'admin',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Arthur'
      },
      // Exactly ONE Teacher Account
      {
        name: 'Prof. Albert Einstein',
        role: 'Teacher',
        loginId: 'T201',
        classOrSubject: 'Physics',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Albert'
      },
      // Sample Students for Out-of-the-Box testing
      {
        name: 'Alex Johnson',
        role: 'Student',
        loginId: 'S101',
        classOrSubject: 'Class A',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex'
      },
      {
        name: 'Sophia Williams',
        role: 'Student',
        loginId: 'S102',
        classOrSubject: 'Class A',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia'
      }
    ];

    await User.insertMany(users);

    const sampleMarks = [
      { studentId: 'S101', subject: 'Physics', examType: 'Midterm', marksObtained: 85, maxMarks: 100, semester: 'Semester 1', uploadedBy: 'T201' },
      { studentId: 'S101', subject: 'Mathematics', examType: 'Midterm', marksObtained: 92, maxMarks: 100, semester: 'Semester 1', uploadedBy: 'T201' },
      { studentId: 'S102', subject: 'Physics', examType: 'Midterm', marksObtained: 78, maxMarks: 100, semester: 'Semester 1', uploadedBy: 'T201' },
      { studentId: 'S102', subject: 'Mathematics', examType: 'Midterm', marksObtained: 64, maxMarks: 100, semester: 'Semester 1', uploadedBy: 'T201' }
    ];

    await Marks.insertMany(sampleMarks);

    await Remark.create({
      studentId: 'S101',
      teacherId: 'T201',
      teacherName: 'Prof. Albert Einstein',
      comment: 'Exceptional analytical skills in physics problem solving.'
    });

    console.log(`✅ Seeded Principal, Teacher, and 2 Sample Students (S101, S102).`);
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedData();
