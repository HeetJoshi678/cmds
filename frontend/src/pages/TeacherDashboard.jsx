import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Navbar from '../components/Common/Navbar';
import ToastContainer from '../components/Common/ToastContainer';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, Award, AlertTriangle, BookOpen, Search, UploadCloud, 
  Download, FileSpreadsheet, Plus, Edit2, MessageSquare, AlertOctagon, 
  Send, X, CheckCircle, ChevronRight, UserCircle, UserPlus, Trash2, Edit3, GraduationCap, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#a855f7', '#f43f5e']; // Violet for Pass, Red for Fail

const TeacherDashboard = () => {
  const { user, updateUserProfile } = useAuth();
  const { addToast } = useNotifications();
  const [loading, setLoading] = useState(true);

  // Main Section Tab: 'internal' or 'gtu'
  const [activeMainTab, setActiveMainTab] = useState('internal');

  // States
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ overall: { pass: 0, fail: 0, total: 0, passRate: 0 }, subjectAnalytics: [], semesterTrend: [] });
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  
  // Subject Change Modal State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectInput, setSubjectInput] = useState(user?.classOrSubject || '');

  // Max Marks Scale State (Out of 30, Out of 50, Out of 100) & Semester State
  const [defaultUploadMaxMarks, setDefaultUploadMaxMarks] = useState('30');
  const [uploadSemester, setUploadSemester] = useState('Semester 1');
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleInput, setScaleInput] = useState('30');
  const [scaling, setScaling] = useState(false);
  
  // Search & Filter
  const [searchName, setSearchName] = useState('');
  const [searchRoll, setSearchRoll] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  // Bulk Upload Internal
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Announcement Composer
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState('All');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Student Details Drawer
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newRemarkComment, setNewRemarkComment] = useState('');

  // Add / Edit Student Profile Modals
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState('add'); // 'add' or 'edit'
  const [studentFormError, setStudentFormError] = useState('');
  const [studentForm, setStudentForm] = useState({
    name: '',
    loginId: '',
    classOrSubject: 'Class A',
    dob: ''
  });

  // Manual Add/Edit Marks modal
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markModalMode, setMarkModalMode] = useState('add'); // 'add' or 'edit'
  const [activeMarkId, setActiveMarkId] = useState(null);
  const [markForm, setMarkForm] = useState({
    studentId: '',
    subject: user?.classOrSubject || 'Physics',
    examType: 'Midterm',
    marksObtained: '',
    maxMarks: 100,
    semester: 'Semester 1'
  });

  // --- GTU RESULT STATES ---
  const [gtuSubTab, setGtuSubTab] = useState('manual'); // 'manual' or 'excel'
  const [gtuSearchQuery, setGtuSearchQuery] = useState('');
  const [gtuSemesterFilter, setGtuSemesterFilter] = useState('');
  const [gtuSubjectFilter, setGtuSubjectFilter] = useState('');
  const [gtuList, setGtuList] = useState([]);
  const [gtuLoading, setGtuLoading] = useState(false);

  const [gtuForm, setGtuForm] = useState({
    studentId: '',
    enrollmentNo: '',
    studentName: '',
    semester: 'Semester 1',
    subjectCode: user?.classOrSubject === 'Minor Project' ? '3160001' : (user?.classOrSubject === 'Physics' ? '3110005' : '3160001'),
    subjectName: user?.classOrSubject || 'Minor Project',
    gtuMarks: '',
    maxMarks: 70,
    gtuGrade: 'AA',
    resultStatus: 'PASS'
  });

  // GTU Edit Modal
  const [showGTUEditModal, setShowGTUEditModal] = useState(false);
  const [editingGTU, setEditingGTU] = useState(null);

  // GTU Excel Upload State
  const [gtuUploadFile, setGtuUploadFile] = useState(null);
  const [gtuUploading, setGtuUploading] = useState(false);
  const [gtuUploadSubject, setGtuUploadSubject] = useState(user?.classOrSubject || 'Minor Project');
  const [gtuUploadSubjectCode, setGtuUploadSubjectCode] = useState('3160001');
  const [gtuUploadSemester, setGtuUploadSemester] = useState('Semester 1');
  const [gtuUploadMaxMarks, setGtuUploadMaxMarks] = useState('70');
  const [gtuImportSummary, setGtuImportSummary] = useState({
    show: false,
    summary: null,
    failedRecords: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get all students
      const studRes = await axios.get('/api/students');
      setStudents(studRes.data);

      // 2. Get analytics stats
      const statsRes = await axios.get('/api/marks/stats');
      const formattedStats = {
        ...statsRes.data,
        subjectAnalytics: (statsRes.data.subjectAnalytics || []).map(s => ({
          ...s,
          passCount: Number(s.passCount ?? s.pass ?? 0),
          failCount: Number(s.failCount ?? s.fail ?? 0)
        }))
      };
      setStats(formattedStats);

      // 3. Gather At-Risk students
      const riskList = [];
      for (const student of studRes.data) {
        const profileRes = await axios.get(`/api/students/profile/${student.loginId}`);
        if (profileRes.data.recommendations?.atRisk) {
          riskList.push({
            ...student,
            weakSubjects: profileRes.data.recommendations.weakSubjects
          });
        }
      }
      setAtRiskStudents(riskList);

    } catch (err) {
      console.error('Error fetching teacher data:', err);
      addToast('Failed to load dashboard records.', 'alert');
    } finally {
      setLoading(false);
    }
  };

  const fetchGTUData = async () => {
    setGtuLoading(true);
    try {
      // Collect all GTU records across enrolled students
      const allGTU = [];
      for (const student of students) {
        const res = await axios.get(`/api/gtu/student/${student.loginId}`);
        if (Array.isArray(res.data)) {
          allGTU.push(...res.data.map(item => ({ ...item, studentName: student.name })));
        }
      }
      setGtuList(allGTU);
    } catch (err) {
      console.error('Error fetching GTU results:', err);
    } finally {
      setGtuLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Synchronize forms when teacher's assigned subject is loaded
  useEffect(() => {
    if (user?.classOrSubject) {
      const sub = user.classOrSubject;
      const code = sub === 'Physics' ? '3110005' : (sub === 'Minor Project' ? '3160001' : '3160001');
      setGtuForm(prev => ({
        ...prev,
        subjectName: sub,
        subjectCode: code
      }));
      setGtuUploadSubject(sub);
      setGtuUploadSubjectCode(code);
      setMarkForm(prev => ({
        ...prev,
        subject: sub
      }));
      setSubjectInput(sub);
    }
  }, [user?.classOrSubject]);

  useEffect(() => {
    if (activeMainTab === 'gtu' && students.length > 0) {
      fetchGTUData();
    }
  }, [activeMainTab, students.length]);

  // Handle Manual GTU Result Save
  const handleSaveGTUManual = async (e) => {
    e.preventDefault();
    if (!gtuForm.studentId || !gtuForm.gtuMarks) {
      addToast('Please enter Student Roll / Enrollment Number and GTU Marks.', 'alert');
      return;
    }

    try {
      const res = await axios.post('/api/gtu/manual', gtuForm);
      addToast(res.data.message || 'GTU Result saved successfully!', 'success');
      const targetSubject = user?.classOrSubject || 'Minor Project';
      const targetCode = targetSubject === 'Physics' ? '3110005' : (targetSubject === 'Minor Project' ? '3160001' : '3160001');
      setGtuForm({
        studentId: '',
        enrollmentNo: '',
        studentName: '',
        semester: 'Semester 1',
        subjectCode: targetCode,
        subjectName: targetSubject,
        gtuMarks: '',
        maxMarks: 70,
        gtuGrade: 'AA',
        resultStatus: 'PASS'
      });
      fetchData();
      fetchGTUData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving GTU result.', 'alert');
    }
  };

  // Open Edit GTU Modal
  const handleOpenGTUEdit = (record) => {
    setEditingGTU(record);
    setShowGTUEditModal(true);
  };

  // Submit GTU Edit
  const handleSaveGTUEdit = async (e) => {
    e.preventDefault();
    if (!editingGTU) return;

    try {
      const res = await axios.put(`/api/gtu/manual/${editingGTU._id}`, editingGTU);
      addToast('GTU Result updated successfully!', 'success');
      setShowGTUEditModal(false);
      setEditingGTU(null);
      fetchGTUData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error editing GTU result.', 'alert');
    }
  };

  // Handle GTU Excel Upload
  const handleGTUExcelUpload = async (e) => {
    e.preventDefault();
    if (!gtuUploadFile) {
      addToast('Please select a GTU Excel file (.xlsx / .xls).', 'alert');
      return;
    }

    const formData = new FormData();
    formData.append('file', gtuUploadFile);
    formData.append('semester', gtuUploadSemester);
    formData.append('subject', gtuUploadSubject.trim());
    formData.append('subjectName', gtuUploadSubject.trim());
    formData.append('subjectCode', gtuUploadSubjectCode.trim());
    formData.append('defaultMaxMarks', gtuUploadMaxMarks || '70');

    setGtuUploading(true);

    try {
      const res = await axios.post('/api/gtu/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setGtuImportSummary({
        show: true,
        summary: res.data.summary,
        failedRecords: res.data.failedRecords || []
      });

      addToast('GTU Excel file imported successfully!', 'success');
      setGtuUploadFile(null);
      fetchData();
      fetchGTUData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error uploading GTU Excel file.', 'alert');
    } finally {
      setGtuUploading(false);
    }
  };

  // Handle Internal Bulk Upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      addToast('Please choose a file to upload.', 'alert');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('defaultMaxMarks', defaultUploadMaxMarks);
    formData.append('semester', uploadSemester);
    setUploading(true);
    setUploadErrors([]);

    try {
      const res = await axios.post('/api/marks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addToast(res.data.message, 'success');
      setUploadFile(null);
      fetchData();
    } catch (err) {
      if (err.response?.data?.errors) {
        setUploadErrors(err.response.data.errors);
      } else {
        addToast(err.response?.data?.message || 'File upload failed.', 'alert');
      }
    } finally {
      setUploading(false);
    }
  };

  // Save Subject Name Change
  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectInput.trim()) return;
    try {
      await axios.put('/api/auth/profile', { classOrSubject: subjectInput.trim() });
      updateUserProfile({ classOrSubject: subjectInput.trim() });
      addToast('Subject name updated successfully!', 'success');
      setShowSubjectModal(false);
    } catch (err) {
      addToast('Failed to update subject name.', 'alert');
    }
  };

  // Batch Scale Max Marks
  const handleBatchScaleMaxMarks = async (e) => {
    e.preventDefault();
    const newMax = Number(scaleInput);
    if (isNaN(newMax) || newMax <= 0) {
      addToast('Please enter a valid target max marks scale.', 'alert');
      return;
    }

    setScaling(true);
    try {
      const res = await axios.put('/api/marks/scale-max-marks', { targetMaxMarks: newMax });
      addToast(res.data.message || `Scaled marks to Out of ${newMax}!`, 'success');
      setShowScaleModal(false);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to scale max marks.', 'alert');
    } finally {
      setScaling(false);
    }
  };

  // Add/Edit Student submit
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setStudentFormError('');

    try {
      if (studentModalMode === 'add') {
        await axios.post('/api/students', studentForm);
        addToast('Student account created successfully.', 'success');
      } else {
        await axios.put(`/api/students/${studentForm.loginId}`, studentForm);
        addToast('Student details updated.', 'success');
      }
      setShowStudentModal(false);
      fetchData();
    } catch (err) {
      setStudentFormError(err.response?.data?.message || 'Error processing student details.');
    }
  };

  // Open Student Details Drawer
  const handleOpenStudentDrawer = async (studentId) => {
    setActiveStudentId(studentId);
    setLoadingDetails(true);
    try {
      const res = await axios.get(`/api/students/profile/${studentId}`);
      setStudentDetails(res.data);
    } catch (err) {
      addToast('Failed to load student profile details.', 'alert');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Manual Mark Modal
  const handleOpenMarkModal = (mode, markRecord = null) => {
    setMarkModalMode(mode);
    setErrorMsg('');
    if (mode === 'add') {
      setMarkForm({
        studentId: activeStudentId || '',
        subject: user?.classOrSubject || 'Physics',
        examType: 'Midterm',
        marksObtained: '',
        maxMarks: 100,
        semester: 'Semester 1'
      });
    } else if (mode === 'edit' && markRecord) {
      setActiveMarkId(markRecord._id);
      setMarkForm({
        studentId: markRecord.studentId,
        subject: markRecord.subject,
        examType: markRecord.examType,
        marksObtained: markRecord.marksObtained,
        maxMarks: markRecord.maxMarks,
        semester: markRecord.semester
      });
    }
    setShowMarkModal(true);
  };

  const [errorMsg, setErrorMsg] = useState('');

  // Submit Manual Mark Add/Edit
  const handleSaveMark = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (markModalMode === 'add') {
        await axios.post('/api/marks/manual', markForm);
        addToast('Student mark entry created!', 'success');
      } else {
        await axios.put(`/api/marks/manual/${activeMarkId}`, markForm);
        addToast('Mark updated successfully.', 'success');
      }
      setShowMarkModal(false);

      if (activeStudentId) {
        handleOpenStudentDrawer(activeStudentId);
      }
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving mark entry.');
    }
  };

  // Submit Remark Comment
  const handleSubmitRemark = async (e) => {
    e.preventDefault();
    if (!newRemarkComment.trim()) return;

    try {
      const res = await axios.post('/api/students/remark', {
        studentId: activeStudentId,
        comment: newRemarkComment
      });
      addToast('Academic comment added!', 'success');
      setStudentDetails(prev => ({
        ...prev,
        remarks: [res.data.data, ...prev.remarks]
      }));
      setNewRemarkComment('');
    } catch (err) {
      addToast('Error leaving remark.', 'alert');
    }
  };

  // Open Student CRUD Modals
  const handleOpenStudentModal = (mode, studentRecord = null) => {
    setStudentModalMode(mode);
    setStudentFormError('');
    if (mode === 'add') {
      setStudentForm({
        name: '',
        loginId: '',
        classOrSubject: 'Class A',
        dob: ''
      });
    } else if (mode === 'edit' && studentRecord) {
      setStudentForm({
        name: studentRecord.name,
        loginId: studentRecord.loginId,
        classOrSubject: studentRecord.classOrSubject,
        dob: studentRecord.dob || ''
      });
    }
    setShowStudentModal(true);
  };

  // Delete Student
  const handleDeleteStudent = async (loginId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete student ${studentName} (${loginId})?`)) return;

    try {
      await axios.delete(`/api/students/${loginId}`);
      addToast('Student account deleted.', 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error deleting student.', 'alert');
    }
  };

  // Submit Broadcast Announcement
  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;

    setSendingAnnouncement(true);
    try {
      await axios.post('/api/notifications/broadcast', {
        message: announcementMsg,
        targetRole: announcementTarget
      });
      addToast('Broadcasting notification alert sent!', 'success');
      setAnnouncementMsg('');
    } catch (err) {
      addToast('Failed to broadcast alert message.', 'alert');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  // Filter students list
  const filteredStudents = students.filter(s => {
    const matchesName = s.name.toLowerCase().includes(searchName.toLowerCase());
    const matchesRoll = s.loginId.toLowerCase().includes(searchRoll.toLowerCase());
    const matchesClass = !filterClass || s.classOrSubject === filterClass;
    return matchesName && matchesRoll && matchesClass;
  });

  // Filter GTU list
  const filteredGTUList = gtuList.filter(g => {
    const q = gtuSearchQuery.toLowerCase();
    const matchesQ = !q || (g.studentId && g.studentId.toLowerCase().includes(q)) || 
                     (g.studentName && g.studentName.toLowerCase().includes(q)) || 
                     (g.subjectName && g.subjectName.toLowerCase().includes(q)) ||
                     (g.subjectCode && g.subjectCode.toLowerCase().includes(q));
    const matchesSem = !gtuSemesterFilter || g.semester === gtuSemesterFilter;
    const matchesSub = !gtuSubjectFilter || g.subjectName?.toLowerCase() === gtuSubjectFilter.toLowerCase();
    return matchesQ && matchesSem && matchesSub;
  });

  const gtuSubjectsList = [...new Set(gtuList.map(g => g.subjectName))].filter(Boolean);

  const classesList = [...new Set(students.map(s => s.classOrSubject))].filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading faculty room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100 transition-colors duration-300 pb-12">
      <Navbar />
      <ToastContainer />

      <motion.main 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8"
      >
        
        {/* Dashboard Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 p-8 text-white shadow-xl glow-pulse-teacher">
          <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] rounded-full bg-white/10 skew-x-12 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="inline-block px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/20">
                Teacher Panel
              </span>
              <h1 className="text-3xl font-extrabold tracking-wide">
                Faculty Desk: {user.name}
              </h1>
              <p className="text-xs text-violet-100 max-w-lg leading-relaxed font-medium">
                Assigned Subject: <span className="font-extrabold text-white underline decoration-violet-300 underline-offset-4">{user?.classOrSubject || 'Not Assigned'}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setSubjectInput(user?.classOrSubject || '');
                  setShowSubjectModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950/40 hover:bg-slate-950/60 border border-white/20 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.98]"
              >
                <Edit3 className="w-4 h-4 text-pink-300" /> Change Subject Name
              </button>

              <button
                onClick={() => setShowScaleModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.98]"
              >
                <Award className="w-4 h-4 text-violet-300" /> Update Max Marks Scale (30/50/100)
              </button>
            </div>
          </div>
        </div>

        {/* 🚀 MAIN SECTION NAVIGATION MENU / TABS */}
        <div className="flex flex-wrap items-center gap-3 p-1.5 bg-[#16162a] border border-white/5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveMainTab('internal')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'internal'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Internal Assessment Marks
          </button>
          <button
            onClick={() => setActiveMainTab('gtu')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'gtu'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-4.5 h-4.5 text-cyan-300" /> GTU Result Management
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: INTERNAL MARKS MANAGEMENT (EXISTING MAIN TAB)                 */}
        {/* ========================================================================= */}
        {activeMainTab === 'internal' && (
          <div className="space-y-8">
            {/* 1. Quick Stats Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between glass-panel glow-border-teacher">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Enrolled Students</span>
                  <h3 className="text-2xl font-black text-slate-100 mt-1">{stats.overall.total}</h3>
                </div>
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between glass-panel glow-border-teacher">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Department Pass Rate</span>
                  <h3 className="text-2xl font-black text-slate-100 mt-1">{stats.overall.passRate}%</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between glass-panel glow-border-teacher">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Passed Students</span>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1">{stats.overall.pass}</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between glass-panel glow-border-teacher">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">At-Risk Students</span>
                  <h3 className="text-2xl font-black text-rose-400 mt-1">{atRiskStudents.length}</h3>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 2. Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Bar Chart: Subject Analytics */}
              <div className="lg:col-span-8 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-teacher">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-md font-bold tracking-wide">Subject Performance Distribution</h2>
                    <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Internal passing ratio per course</p>
                  </div>
                  <BookOpen className="w-5 h-5 text-violet-400" />
                </div>

                <div className="h-64">
                  {stats.subjectAnalytics.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                      No grade distribution data recorded.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.subjectAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f0f1a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="passCount" fill="#a855f7" name="Passed" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="failCount" fill="#f43f5e" name="Failed" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Pie Chart: Overall Ratio */}
              <div className="lg:col-span-4 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col justify-between glass-panel glow-border-teacher">
                <div>
                  <h2 className="text-md font-bold tracking-wide">Overall Pass / Fail Ratio</h2>
                  <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider mb-4">Department summary</p>
                </div>

                <div className="h-48 relative flex items-center justify-center">
                  {stats.overall.total === 0 ? (
                    <span className="text-xs text-slate-500 font-bold">No students registered</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Passed', value: stats.overall.pass },
                            { name: 'Failed', value: stats.overall.fail }
                          ]}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#a855f7" />
                          <Cell fill="#f43f5e" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f0f1a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-violet-500" />
                    <span>Pass ({stats.overall.pass})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Fail ({stats.overall.fail})</span>
                  </div>
                </div>
              </div>

            </div>

            {/* 3. Bulk Upload & Notification Broadcast Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Internal Bulk Upload Excel (Left 7 Cols) */}
              <div className="lg:col-span-7 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-teacher space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-violet-950/40 text-violet-400 border border-violet-500/10">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-md font-bold tracking-wide">Bulk Ingestion (Excel / CSV)</h2>
                      <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Batch upload student grade sheets</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,RollNumber,StudentName,Subject,ExamType,MarksObtained,MaxMarks,Semester\nS1,Aarav Patel,Physics,Midterm,22,30,Semester 1\nS2,Ananya Sharma,Physics,Midterm,28,30,Semester 1";
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Sample_Grade_Sheet.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Download Template
                  </button>
                </div>

                <form onSubmit={handleBulkUpload} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-2 p-3 bg-slate-950/40 border border-white/5 rounded-2xl">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sheet Max Scale</label>
                      <select
                        value={defaultUploadMaxMarks}
                        onChange={(e) => setDefaultUploadMaxMarks(e.target.value)}
                        className="px-2.5 py-1.5 border border-white/10 bg-slate-900 text-violet-300 font-extrabold rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                      >
                        <option value="30">Out of 30</option>
                        <option value="50">Out of 50</option>
                        <option value="100">Out of 100</option>
                        <option value="20">Out of 20</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3 bg-slate-950/40 border border-white/5 rounded-2xl">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Semester</label>
                      <select
                        value={uploadSemester}
                        onChange={(e) => setUploadSemester(e.target.value)}
                        className="px-2.5 py-1.5 border border-white/10 bg-slate-900 text-violet-300 font-extrabold rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer font-bold"
                      >
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                        <option value="Semester 3">Semester 3</option>
                        <option value="Semester 4">Semester 4</option>
                        <option value="Semester 5">Semester 5</option>
                        <option value="Semester 6">Semester 6</option>
                        <option value="Semester 7">Semester 7</option>
                        <option value="Semester 8">Semester 8</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-white/5 rounded-2xl p-6 text-center hover:border-violet-500/30 transition-colors relative">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-violet-400 animate-bounce" />
                      <span className="text-xs font-bold text-slate-300">
                        {uploadFile ? uploadFile.name : 'Drag and drop Excel/CSV grade sheet or click to browse'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">Supports CSV, XLSX, XLS with automatic header mapping</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/10"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing Sheet...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" /> Ingest & Publish Grade Sheet
                      </>
                    )}
                  </button>
                </form>

                {/* Validation Errors Box */}
                {uploadErrors.length > 0 && (
                  <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-2xl space-y-2 text-xs text-rose-300 max-h-40 overflow-y-auto">
                    <span className="font-bold flex items-center gap-1 text-rose-400">
                      <AlertOctagon className="w-4 h-4" /> Import Errors ({uploadErrors.length}):
                    </span>
                    <ul className="list-disc pl-5 space-y-1 font-mono text-[10px]">
                      {uploadErrors.map((err, i) => (
                        <li key={i}>Row {err.row}: {err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Announcement Broadcast (Right 5 Cols) */}
              <div className="lg:col-span-5 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-teacher space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-lg bg-purple-950/40 text-purple-400 border border-purple-500/10">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-md font-bold tracking-wide">Broadcast Alert</h2>
                      <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Send instant notification to students</p>
                    </div>
                  </div>

                  <form onSubmit={handleSendAnnouncement} className="space-y-4">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1.5">Target Audience</label>
                      <select
                        value={announcementTarget}
                        onChange={(e) => setAnnouncementTarget(e.target.value)}
                        className="w-full p-2.5 border border-white/5 bg-slate-950/30 text-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="All" className="bg-[#131324] text-slate-200">All Students</option>
                        <option value="Student" className="bg-[#131324] text-slate-200">Enrolled Class Students</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1.5">Message Content</label>
                      <textarea
                        rows="3"
                        value={announcementMsg}
                        onChange={(e) => setAnnouncementMsg(e.target.value)}
                        placeholder="Enter announcement text..."
                        className="w-full p-3 border border-white/5 bg-slate-950/30 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingAnnouncement || !announcementMsg.trim()}
                      className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/5 text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-violet-400" /> Broadcast Announcement
                    </button>
                  </form>
                </div>
              </div>

            </div>

            {/* 4. Student Directory List & At-Risk Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Directory Table (Left 8 Cols) */}
              <div className="lg:col-span-8 bg-[#1a1a2e]/30 border border-white/5 rounded-3xl shadow-xl glass-panel glow-border-teacher overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/10">
                  <div>
                    <h2 className="text-md font-bold tracking-wide">Student Directory</h2>
                    <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Search and manage class profiles</p>
                  </div>

                  {/* Add Student and Manual Mark buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenStudentModal('add')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/10 hover:opacity-95 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add Student
                    </button>
                    <button
                      onClick={() => handleOpenMarkModal('add')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-300 rounded-xl text-xs font-bold hover:text-white transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Mark Manual
                    </button>
                  </div>
                </div>

                {/* Filter controls */}
                <div className="p-6 bg-slate-950/5 border-b border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter name..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-white/5 bg-slate-950/30 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none"
                    />
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter roll number..."
                      value={searchRoll}
                      onChange={(e) => setSearchRoll(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-white/5 bg-slate-950/30 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none"
                    />
                  </div>

                  <div>
                    <select
                      value={filterSemester}
                      onChange={(e) => setFilterSemester(e.target.value)}
                      className="w-full px-3 py-2 border border-white/5 bg-slate-950/30 text-slate-300 rounded-xl text-xs focus:outline-none font-semibold cursor-pointer"
                    >
                      <option value="" className="bg-[#131324] text-slate-300">All Semesters</option>
                      <option value="Semester 1" className="bg-[#131324] text-slate-300">Semester 1</option>
                      <option value="Semester 2" className="bg-[#131324] text-slate-300">Semester 2</option>
                      <option value="Semester 3" className="bg-[#131324] text-slate-300">Semester 3</option>
                      <option value="Semester 4" className="bg-[#131324] text-slate-300">Semester 4</option>
                      <option value="Semester 5" className="bg-[#131324] text-slate-300">Semester 5</option>
                      <option value="Semester 6" className="bg-[#131324] text-slate-300">Semester 6</option>
                      <option value="Semester 7" className="bg-[#131324] text-slate-300">Semester 7</option>
                      <option value="Semester 8" className="bg-[#131324] text-slate-300">Semester 8</option>
                    </select>
                  </div>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/20 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                        <th className="py-4 px-6">Student</th>
                        <th className="py-4 px-6">Roll Number</th>
                        <th className="py-4 px-6">Class / Subject</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-medium">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-10 text-center text-slate-500 font-semibold">
                            No matching student profiles found.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr key={s._id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-6 font-bold flex items-center gap-3">
                              <img
                                src={s.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full border border-white/10 bg-slate-950/20"
                              />
                              <div>
                                <span className="text-slate-200 block">{s.name}</span>
                                {s.dob && (
                                  <span className="text-[10px] text-slate-400 font-normal block">DOB: {s.dob}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 font-mono text-violet-400 font-bold">
                              <div>
                                <span>{s.loginId}</span>
                                {s.password && (
                                  <span className="text-[10px] text-slate-500 font-normal block">Pass: {s.password}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-400">
                              {s.classOrSubject}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenStudentDrawer(s.loginId)}
                                  className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-300 rounded-lg text-[11px] font-bold hover:text-white transition-all flex items-center gap-1"
                                >
                                  View Ledger <ChevronRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleOpenStudentModal('edit', s)}
                                  className="p-1.5 text-slate-500 hover:text-violet-400 rounded-lg hover:bg-white/5 transition-colors"
                                  title="Edit Student Info"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(s.loginId, s.name)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* At-Risk Students Panel (Right 4 Cols) */}
              <div className="lg:col-span-4 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-teacher space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" /> At-Risk Students Warning ({atRiskStudents.length})
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Students scoring under 40% threshold requiring immediate academic intervention.</p>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {atRiskStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-emerald-400 bg-emerald-950/10 border border-emerald-900/20 rounded-2xl">
                      🎉 No students currently flagged at-risk!
                    </div>
                  ) : (
                    atRiskStudents.map((risk) => (
                      <div key={risk._id} className="p-3.5 bg-rose-950/10 border border-rose-900/30 rounded-2xl text-xs space-y-1.5 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-200">{risk.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">Roll: {risk.loginId}</span>
                          {risk.weakSubjects?.length > 0 && (
                            <div className="text-[9px] text-rose-300 font-semibold mt-1">
                              Needs Help: {risk.weakSubjects.join(', ')}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenStudentDrawer(risk.loginId)}
                          className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold text-[10px] rounded-lg hover:bg-rose-500/20 transition-colors"
                        >
                          Advise
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: GTU RESULT MANAGEMENT (NEW MAIN TAB)                          */}
        {/* ========================================================================= */}
        {activeMainTab === 'gtu' && (
          <div className="space-y-8">
            
            {/* Sub-Tab Toggle Bar */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGtuSubTab('manual')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    gtuSubTab === 'manual'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white bg-slate-950/20'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Enter GTU Result Manually
                </button>
                <button
                  onClick={() => setGtuSubTab('excel')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    gtuSubTab === 'excel'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white bg-slate-950/20'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" /> Upload GTU Result through Excel
                </button>
              </div>

              <button
                onClick={fetchGTUData}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-400 hover:text-white transition-all font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh GTU Records
              </button>
            </div>

            {/* SUB-TAB A: MANUAL GTU RESULT ENTRY */}
            {gtuSubTab === 'manual' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Manual Entry Form Card (Left 5 Cols) */}
                <div className="lg:col-span-5 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-student space-y-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-950/40 text-cyan-400 border border-cyan-500/10">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-md font-bold tracking-wide">Enter GTU Result</h2>
                      <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Manual GTU Score Submission</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveGTUManual} className="space-y-4">
                    {/* Student Roll Selection */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Select or Enter Student Roll / Enrollment No</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={gtuForm.studentId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = students.find(s => s.loginId.toLowerCase() === val.toLowerCase());
                            setGtuForm(prev => ({ 
                              ...prev, 
                              studentId: val,
                              enrollmentNo: val,
                              studentName: matched ? matched.name : ''
                            }));
                          }}
                          placeholder="e.g. S1, 123, 190010116001..."
                          className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/40 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-bold"
                        />
                      </div>
                      {gtuForm.studentName && (
                        <span className="text-[10px] font-bold text-cyan-400 mt-1 block">Matched Student: {gtuForm.studentName}</span>
                      )}
                    </div>

                    {/* Semester & Subject Code */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Semester</label>
                        <select
                          value={gtuForm.semester}
                          onChange={(e) => setGtuForm(prev => ({ ...prev, semester: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/40 text-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                        >
                          <option value="Semester 1" className="bg-[#131324]">Semester 1</option>
                          <option value="Semester 2" className="bg-[#131324]">Semester 2</option>
                          <option value="Semester 3" className="bg-[#131324]">Semester 3</option>
                          <option value="Semester 4" className="bg-[#131324]">Semester 4</option>
                          <option value="Semester 5" className="bg-[#131324]">Semester 5</option>
                          <option value="Semester 6" className="bg-[#131324]">Semester 6</option>
                          <option value="Semester 7" className="bg-[#131324]">Semester 7</option>
                          <option value="Semester 8" className="bg-[#131324]">Semester 8</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Subject Code</label>
                        <input
                          type="text"
                          value={gtuForm.subjectCode}
                          onChange={(e) => setGtuForm(prev => ({ ...prev, subjectCode: e.target.value }))}
                          placeholder="e.g. 3110005"
                          className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/40 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Subject Name */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Subject Name</label>
                      <input
                        type="text"
                        required
                        value={gtuForm.subjectName}
                        onChange={(e) => setGtuForm(prev => ({ ...prev, subjectName: e.target.value }))}
                        placeholder="e.g. Programming in C, Physics..."
                        className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/40 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold"
                      />
                    </div>

                    {/* GTU Marks & Grade */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">GTU Marks (out of 70)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="70"
                          value={gtuForm.gtuMarks}
                          onChange={(e) => setGtuForm(prev => ({ ...prev, gtuMarks: e.target.value }))}
                          placeholder="e.g. 58"
                          className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/40 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bold font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">GTU Grade</label>
                        <select
                          value={gtuForm.gtuGrade}
                          onChange={(e) => setGtuForm(prev => ({ ...prev, gtuGrade: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/40 text-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                        >
                          <option value="AA" className="bg-[#131324]">AA (60+ / 70)</option>
                          <option value="AB" className="bg-[#131324]">AB (53+ / 70)</option>
                          <option value="BB" className="bg-[#131324]">BB (46+ / 70)</option>
                          <option value="BC" className="bg-[#131324]">BC (39+ / 70)</option>
                          <option value="CC" className="bg-[#131324]">CC (32+ / 70)</option>
                          <option value="CD" className="bg-[#131324]">CD (28+ / 70)</option>
                          <option value="DD" className="bg-[#131324]">DD (23+ / 70)</option>
                          <option value="FF" className="bg-[#131324]">FF (Below 23 Fail)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-xs shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Save & Publish GTU Result
                    </button>
                  </form>
                </div>

                {/* Existing GTU Records Table (Right 7 Cols) */}
                <div className="lg:col-span-7 bg-[#1a1a2e]/30 border border-white/5 rounded-3xl shadow-xl overflow-hidden glass-panel glow-border-student">
                  <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/10">
                    <div>
                      <h2 className="text-md font-bold tracking-wide">GTU Evaluation Ledger</h2>
                      <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">All recorded GTU results</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search GTU records..."
                          value={gtuSearchQuery}
                          onChange={(e) => setGtuSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 border border-white/5 bg-slate-950/40 text-slate-200 rounded-xl text-xs focus:outline-none"
                        />
                      </div>

                      {gtuSubjectsList.length > 1 && (
                        <select
                          value={gtuSubjectFilter}
                          onChange={(e) => setGtuSubjectFilter(e.target.value)}
                          className="px-2.5 py-1.5 border border-white/5 bg-slate-950/40 text-slate-300 rounded-xl text-xs focus:outline-none font-semibold cursor-pointer"
                        >
                          <option value="" className="bg-[#131324]">All Subjects</option>
                          {gtuSubjectsList.map(s => (
                            <option key={s} value={s} className="bg-[#131324]">{s}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/20 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                          <th className="py-4 px-6">Student</th>
                          <th className="py-4 px-6">Semester</th>
                          <th className="py-4 px-6">Subject</th>
                          <th className="py-4 px-6">GTU Marks</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs font-medium">
                        {gtuLoading ? (
                          <tr>
                            <td colSpan="5" className="py-10 text-center text-slate-500 font-semibold">
                              Loading GTU evaluation records...
                            </td>
                          </tr>
                        ) : filteredGTUList.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-10 text-center text-slate-500 font-semibold">
                              No GTU results found. Enter manual result or upload Excel file above.
                            </td>
                          </tr>
                        ) : (
                          filteredGTUList.map((g) => (
                            <tr key={g._id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 px-6 font-bold text-slate-200">
                                <span className="block font-mono text-cyan-400 text-[11px]">{g.studentId}</span>
                                {g.studentName || 'Student'}
                              </td>
                              <td className="py-4 px-6 text-slate-400">
                                {g.semester}
                              </td>
                              <td className="py-4 px-6 text-slate-200">
                                <span className="font-mono text-slate-500 text-[10px] mr-1">{g.subjectCode}</span>
                                {g.subjectName}
                              </td>
                              <td className="py-4 px-6 font-mono font-bold text-cyan-300">
                                {g.gtuMarks} / {g.maxMarks || 70} ({g.gtuGrade || 'AA'})
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleOpenGTUEdit(g)}
                                  className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-white/5 transition-all"
                                  title="Edit GTU Result"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* SUB-TAB B: UPLOAD GTU RESULT THROUGH EXCEL */}
            {gtuSubTab === 'excel' && (
              <div className="max-w-3xl mx-auto bg-[#1a1a2e]/30 border border-white/5 p-8 rounded-3xl shadow-xl glass-panel glow-border-student space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-950/40 text-cyan-400 border border-cyan-500/10">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-wide">Upload GTU Result Excel Sheet</h2>
                      <p className="text-xs text-slate-450 font-medium">Automatic intelligent column mapping & student auto-registration</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,EnrollmentNumber,StudentName,Semester,SubjectCode,SubjectName,GTUMarks,ResultStatus\n190010116001,Aarav Patel,Semester 1,3110005,Programming in C,82,PASS\n190010116002,Ananya Sharma,Semester 1,3110005,Programming in C,74,PASS";
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "GTU_Result_Upload_Template.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-slate-950/40 hover:bg-slate-900 text-xs font-bold text-cyan-400 hover:text-white transition-all"
                  >
                    <Download className="w-4 h-4" /> Download GTU Excel Template
                  </button>
                </div>

                <form onSubmit={handleGTUExcelUpload} className="space-y-6">
                  {/* GTU Upload Configuration Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-950/40 rounded-2xl border border-white/5">
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase mb-1.5 tracking-wider">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        required
                        value={gtuUploadSubject}
                        onChange={(e) => setGtuUploadSubject(e.target.value)}
                        placeholder="e.g. Minor Project"
                        className="w-full px-3 py-2 border border-white/10 bg-slate-900 text-slate-200 font-bold rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase mb-1.5 tracking-wider">
                        Subject Code
                      </label>
                      <input
                        type="text"
                        value={gtuUploadSubjectCode}
                        onChange={(e) => setGtuUploadSubjectCode(e.target.value)}
                        placeholder="e.g. 3160001"
                        className="w-full px-3 py-2 border border-white/10 bg-slate-900 text-slate-200 font-mono rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase mb-1.5 tracking-wider">
                        Semester
                      </label>
                      <select
                        value={gtuUploadSemester}
                        onChange={(e) => setGtuUploadSemester(e.target.value)}
                        className="w-full px-3 py-2 border border-white/10 bg-slate-900 text-slate-200 font-bold rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                      >
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                        <option value="Semester 3">Semester 3</option>
                        <option value="Semester 4">Semester 4</option>
                        <option value="Semester 5">Semester 5</option>
                        <option value="Semester 6">Semester 6</option>
                        <option value="Semester 7">Semester 7</option>
                        <option value="Semester 8">Semester 8</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase mb-1.5 tracking-wider">
                        GTU Max Marks
                      </label>
                      <select
                        value={gtuUploadMaxMarks}
                        onChange={(e) => setGtuUploadMaxMarks(e.target.value)}
                        className="w-full px-3 py-2 border border-white/10 bg-slate-900 text-cyan-300 font-extrabold rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                      >
                        <option value="70">Out of 70 (GTU Standard)</option>
                        <option value="100">Out of 100</option>
                        <option value="50">Out of 50</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 text-center hover:border-cyan-500/40 transition-colors relative bg-slate-950/20">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => setGtuUploadFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <UploadCloud className="w-12 h-12 text-cyan-400 animate-bounce" />
                      <span className="text-sm font-bold text-slate-200">
                        {gtuUploadFile ? gtuUploadFile.name : 'Select or drag GTU Excel File (.xlsx, .xls, .csv)'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Expected Columns: Roll Number, Student Name, Marks/OBTAIN MARKS. Auto-mapped to <strong className="text-cyan-300">{gtuUploadSubject}</strong> (Out of {gtuUploadMaxMarks}).
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={gtuUploading || !gtuUploadFile}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 text-white font-extrabold text-sm shadow-xl hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {gtuUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Validating & Importing GTU Excel Data...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5" /> Import GTU Excel Sheet
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

      </motion.main>

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* GTU Edit Modal */}
      {showGTUEditModal && editingGTU && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setShowGTUEditModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-md bg-[#131324] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 text-left glass-panel-heavy z-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" /> Edit GTU Result
              </h3>
              <button onClick={() => setShowGTUEditModal(false)} className="p-1 text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGTUEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Student Roll / ID</label>
                <input
                  type="text"
                  disabled
                  value={editingGTU.studentId}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/5 text-slate-400 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Subject Name</label>
                <input
                  type="text"
                  value={editingGTU.subjectName}
                  onChange={(e) => setEditingGTU(prev => ({ ...prev, subjectName: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950/40 border border-white/5 text-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">GTU Marks (out of 70)</label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={editingGTU.gtuMarks}
                    onChange={(e) => setEditingGTU(prev => ({ ...prev, gtuMarks: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950/40 border border-white/5 text-cyan-300 rounded-xl font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">GTU Grade</label>
                  <select
                    value={editingGTU.gtuGrade || 'AA'}
                    onChange={(e) => setEditingGTU(prev => ({ ...prev, gtuGrade: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950/40 border border-white/5 text-slate-200 rounded-xl font-bold"
                  >
                    <option value="AA" className="bg-[#131324]">AA (60+ / 70)</option>
                    <option value="AB" className="bg-[#131324]">AB (53+ / 70)</option>
                    <option value="BB" className="bg-[#131324]">BB (46+ / 70)</option>
                    <option value="BC" className="bg-[#131324]">BC (39+ / 70)</option>
                    <option value="CC" className="bg-[#131324]">CC (32+ / 70)</option>
                    <option value="CD" className="bg-[#131324]">CD (28+ / 70)</option>
                    <option value="DD" className="bg-[#131324]">DD (23+ / 70)</option>
                    <option value="FF" className="bg-[#131324]">FF (Below 23 Fail)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowGTUEditModal(false)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GTU Import Summary Modal */}
      {gtuImportSummary.show && gtuImportSummary.summary && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setGtuImportSummary({ show: false, summary: null, failedRecords: [] })} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-xl bg-[#131324] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 text-left glass-panel-heavy z-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" /> GTU Excel Import Completed
              </h3>
              <button 
                onClick={() => setGtuImportSummary({ show: false, summary: null, failedRecords: [] })}
                className="p-1 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Counters */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
                <span className="text-2xl font-black text-emerald-400 block">{gtuImportSummary.summary.updatedCount}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Existing Updated</span>
              </div>
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl">
                <span className="text-2xl font-black text-cyan-400 block">{gtuImportSummary.summary.createdCount}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">New Registered</span>
              </div>
              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-2xl">
                <span className="text-2xl font-black text-rose-400 block">{gtuImportSummary.summary.failedCount}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Failed Records</span>
              </div>
            </div>

            {/* Failed Records Table */}
            {gtuImportSummary.failedRecords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4" /> Failure Details ({gtuImportSummary.failedRecords.length})
                </h4>
                <div className="max-h-44 overflow-y-auto border border-white/5 rounded-2xl p-2 bg-slate-950/40 text-xs space-y-1.5">
                  {gtuImportSummary.failedRecords.map((f, idx) => (
                    <div key={idx} className="p-2 bg-rose-950/10 border border-rose-900/20 rounded-xl text-[11px] flex items-center justify-between text-rose-300">
                      <span>Row {f.row}: Roll <strong>{f.rollNumber}</strong> ({f.name})</span>
                      <span className="font-semibold text-rose-400">{f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setGtuImportSummary({ show: false, summary: null, failedRecords: [] })}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Name Edit Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setShowSubjectModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-md bg-[#131324] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 text-left glass-panel-heavy z-10">
            <div>
              <h3 className="text-lg font-bold text-white">
                Update Teaching Subject Name
              </h3>
              <p className="text-xs text-slate-500">Change the assigned subject name for your faculty desk.</p>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="e.g. Physics, Minor Project, Machine Learning..."
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scale Max Marks Modal */}
      {showScaleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setShowScaleModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-md bg-[#131324] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 text-left glass-panel-heavy z-10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-violet-400" /> Update Max Marks Scale
              </h3>
              <p className="text-xs text-slate-500">Rescale existing marks proportionally (e.g. 30 to 100 or 100 to 30).</p>
            </div>

            <form onSubmit={handleBatchScaleMaxMarks} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Target Scale</label>
                <select
                  value={scaleInput}
                  onChange={(e) => setScaleInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-violet-300 font-extrabold rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="30" className="bg-[#131324]">Out of 30 (MSE / Internal)</option>
                  <option value="50" className="bg-[#131324]">Out of 50</option>
                  <option value="100" className="bg-[#131324]">Out of 100 (Final / Endterm)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowScaleModal(false)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scaling}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  {scaling ? 'Scaling Marks...' : 'Apply Scale Resampling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Student Account Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setShowStudentModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-md bg-[#131324] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 text-left glass-panel-heavy z-10">
            <div>
              <h3 className="text-lg font-bold text-white">
                {studentModalMode === 'add' ? 'Add New Student Account' : 'Edit Student Profile'}
              </h3>
              <p className="text-xs text-slate-500">Student uses Roll Number as login ID and password 123.</p>
            </div>

            {studentFormError && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-400 font-bold">
                {studentFormError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Aarav Patel"
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Roll Number (Login ID)</label>
                <input
                  type="text"
                  required
                  disabled={studentModalMode === 'edit'}
                  value={studentForm.loginId}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, loginId: e.target.value }))}
                  placeholder="e.g. S1"
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Class / Section</label>
                <input
                  type="text"
                  required
                  value={studentForm.classOrSubject}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, classOrSubject: e.target.value }))}
                  placeholder="e.g. Class A"
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Date of Birth (DOB)</label>
                <input
                  type="text"
                  value={studentForm.dob}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, dob: e.target.value }))}
                  placeholder="e.g. 15/04/2007 or DD/MM/YYYY"
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                />
                <span className="text-[9px] text-slate-500 mt-1 block">Default password formula: firstname + DD + M + last_year_digit (e.g. aarav1547)</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  {studentModalMode === 'add' ? 'Create Account' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Mark Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setShowMarkModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-md bg-[#131324] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 text-left glass-panel-heavy z-10">
            <div>
              <h3 className="text-lg font-bold text-white">
                {markModalMode === 'add' ? 'Manual Mark Entry' : 'Edit Mark Record'}
              </h3>
              <p className="text-xs text-slate-500">Record assessment score for a student.</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-400 font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveMark} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Student Roll Number</label>
                <input
                  type="text"
                  required
                  disabled={markModalMode === 'edit'}
                  value={markForm.studentId}
                  onChange={(e) => setMarkForm(prev => ({ ...prev, studentId: e.target.value }))}
                  placeholder="e.g. S1"
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-955/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={markForm.subject}
                    onChange={(e) => setMarkForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/5 bg-slate-955/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Semester</label>
                  <select
                    value={markForm.semester}
                    onChange={(e) => setMarkForm(prev => ({ ...prev, semester: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/5 bg-slate-955/35 text-slate-200 rounded-xl text-xs focus:outline-none font-bold"
                  >
                    <option value="Semester 1" className="bg-[#131324]">Semester 1</option>
                    <option value="Semester 2" className="bg-[#131324]">Semester 2</option>
                    <option value="Semester 3" className="bg-[#131324]">Semester 3</option>
                    <option value="Semester 4" className="bg-[#131324]">Semester 4</option>
                    <option value="Semester 5" className="bg-[#131324]">Semester 5</option>
                    <option value="Semester 6" className="bg-[#131324]">Semester 6</option>
                    <option value="Semester 7" className="bg-[#131324]">Semester 7</option>
                    <option value="Semester 8" className="bg-[#131324]">Semester 8</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Exam Type</label>
                  <input
                    type="text"
                    required
                    value={markForm.examType}
                    onChange={(e) => setMarkForm(prev => ({ ...prev, examType: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/5 bg-slate-955/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Marks Obtained</label>
                  <input
                    type="number"
                    required
                    value={markForm.marksObtained}
                    onChange={(e) => setMarkForm(prev => ({ ...prev, marksObtained: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/5 bg-slate-955/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  {markModalMode === 'add' ? 'Publish Mark' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details Drawer */}
      {activeStudentId && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div onClick={() => setActiveStudentId(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" />
          
          <div className="relative w-full max-w-2xl bg-[#0f0f1a] border-l border-white/5 h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between z-10 glass-panel-heavy">
            {loadingDetails ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
              </div>
            ) : studentDetails ? (
              <div className="space-y-8 text-left">
                {/* Header Profile info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={studentDetails.student.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full bg-slate-955 border border-white/10" />
                    <div>
                      <h3 className="text-xl font-bold text-white">{studentDetails.student.name}</h3>
                      <span className="text-xs text-slate-400 block">Roll: {studentDetails.student.loginId} | Class: {studentDetails.student.classOrSubject}</span>
                      {studentDetails.student.dob && (
                        <span className="text-xs text-violet-300 font-semibold block mt-0.5">
                          DOB: {studentDetails.student.dob} {studentDetails.student.password ? `| Password: ${studentDetails.student.password}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setActiveStudentId(null)} className="p-1.5 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-white/5">
                    <h4 className="font-bold text-sm text-slate-350 uppercase tracking-wider">Grade Ledger</h4>
                    <button
                      onClick={() => handleOpenMarkModal('add')}
                      className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold text-xs rounded-lg hover:bg-violet-500/20 transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Mark
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {studentDetails.marks.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No internal grades recorded yet.</p>
                    ) : (
                      studentDetails.marks.map((mark) => (
                        <div key={mark._id} className="p-3 bg-slate-955/30 border border-white/5 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-250 block">{mark.subject}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{mark.examType} | {mark.semester}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-200">{mark.marksObtained} / {mark.maxMarks}</span>
                            <button
                              onClick={() => handleOpenMarkModal('edit', mark)}
                              className="p-1 text-slate-500 hover:text-white"
                              title="Edit Mark"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* GTU Results in Drawer */}
                {studentDetails.gtuResults && studentDetails.gtuResults.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-cyan-400 border-b pb-2 border-white/5 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" /> GTU Board Results
                    </h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {studentDetails.gtuResults.map((gtu) => (
                        <div key={gtu._id} className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-200 block">{gtu.subjectCode} {gtu.subjectName}</span>
                            <span className="text-[10px] text-slate-450">{gtu.semester}</span>
                          </div>
                          <span className="font-bold font-mono text-cyan-300">{gtu.gtuMarks} / {gtu.maxMarks || 70} ({gtu.gtuGrade})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks list */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-350 border-b pb-2 border-white/5 uppercase tracking-wider">Faculty Remarks History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {studentDetails.remarks.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No comments logged.</p>
                    ) : (
                      studentDetails.remarks.map((rem) => (
                        <div key={rem._id} className="p-3 border border-white/5 rounded-xl text-xs space-y-1 bg-slate-955/10">
                          <div className="flex items-center justify-between text-slate-500 text-[9px] font-bold">
                            <span>{rem.teacherName}</span>
                            <span>{new Date(rem.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-300 italic">"{rem.comment}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add new remark form */}
                <form onSubmit={handleSubmitRemark} className="space-y-3 pt-4 border-t border-white/5">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Leave Academic Observation</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type note or recommendation..."
                      value={newRemarkComment}
                      onChange={(e) => setNewRemarkComment(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-955/40 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <button type="submit" className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl text-xs font-bold">
                      Post Comment
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <p className="text-slate-500 text-xs font-bold text-center">No record selected.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherDashboard;
