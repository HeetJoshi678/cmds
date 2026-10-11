import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Navbar from '../components/Common/Navbar';
import ToastContainer from '../components/Common/ToastContainer';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Users, Award, Calendar, BookOpen, Search, Download, 
  History, Flame, GraduationCap, Trophy, ChevronRight, X, CircleUser 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PrincipalDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [loading, setLoading] = useState(true);

  // States
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({ overall: { pass: 0, fail: 0, total: 0, passRate: 0 }, subjectAnalytics: [], semesterTrend: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [logs, setLogs] = useState([]);

  // Teacher Management State
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherFormError, setTeacherFormError] = useState('');
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    loginId: '',
    classOrSubject: 'Physics',
    assignedSemester: 'Semester 1'
  });

  // Global student search
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Student Details Drawer (Read Only)
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Students list
      const studRes = await axios.get('/api/students');
      setStudents(studRes.data);

      // 2. Teachers list
      const teachRes = await axios.get('/api/students/teachers');
      setTeachers(teachRes.data);

      // 3. Overall department stats
      const statsRes = await axios.get('/api/marks/stats');
      setStats(statsRes.data);

      // 4. Leaderboard data
      const leadRes = await axios.get('/api/marks/leaderboard');
      setLeaderboard(leadRes.data);

      // 5. Audit logs
      const logsRes = await axios.get('/api/students/logs');
      setLogs(logsRes.data);

    } catch (err) {
      console.error('Error fetching principal data:', err);
      addToast('Failed to load department records.', 'alert');
    } finally {
      setLoading(false);
    }
  };

  // Save New Teacher Profile
  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    setTeacherFormError('');

    try {
      await axios.post('/api/students/teachers', teacherForm);
      addToast('Faculty profile created successfully.', 'success');
      setShowTeacherModal(false);
      setTeacherForm({ name: '', loginId: '', classOrSubject: 'Physics', assignedSemester: 'Semester 1' });
      fetchData();
    } catch (err) {
      setTeacherFormError(err.response?.data?.message || 'Error registering teacher profile.');
    }
  };

  // Delete Teacher Profile
  const handleDeleteTeacher = async (loginId, teacherName) => {
    if (!window.confirm(`Are you sure you want to remove teacher ${teacherName} (${loginId})?`)) return;

    try {
      await axios.delete(`/api/students/teachers/${loginId}`);
      addToast('Teacher account removed.', 'success');
      fetchData();
    } catch (err) {
      addToast('Failed to remove teacher profile.', 'alert');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Global search filtering
  const matchingSearchStudents = students.filter(s => 
    s.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
    s.loginId.toLowerCase().includes(globalSearchQuery.toLowerCase())
  );

  // Open Student drawer
  const handleOpenStudentDrawer = async (rollNum) => {
    setActiveStudentId(rollNum);
    setShowSearchDropdown(false);
    setLoadingDetails(true);
    try {
      const res = await axios.get(`/api/students/profile/${rollNum}`);
      setStudentDetails(res.data);
    } catch (err) {
      addToast('Failed to load profile details.', 'alert');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Export full department reports (CSV Format)
  const handleExportCSVReport = () => {
    if (students.length === 0) {
      addToast('No student data available to export.', 'alert');
      return;
    }
    try {
      const headers = ['RollNumber', 'Name', 'Subject', 'ExamType', 'MarksObtained', 'MaxMarks', 'Semester', 'Pass/Fail'];
      axios.get('/api/marks').then(res => {
        const marks = res.data;
        const rows = marks.map(m => {
          const studentProfile = students.find(s => s.loginId === m.studentId);
          const studentName = studentProfile ? studentProfile.name : 'Unknown';
          const pct = (m.marksObtained / m.maxMarks) * 100;
          return `"${m.studentId}","${studentName}","${m.subject}","${m.examType}",${m.marksObtained},${m.maxMarks},"${m.semester}","${pct >= 40 ? 'Pass' : 'Fail'}"`;
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const url = window.URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Department_Academic_Report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        addToast('Department report compiled & downloaded.', 'success');
      });
    } catch (err) {
      addToast('Failed to export reports.', 'alert');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading dean office...</span>
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
        
        {/* Dashboard Header & Global Search */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-550 via-orange-500 to-rose-500 p-8 text-white shadow-xl glow-pulse-principal">
          <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] rounded-full bg-white/10 skew-x-12 pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <span className="inline-block px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/20">
                Principal Panel
              </span>
              <h1 className="text-3xl font-extrabold tracking-wide">
                Dean Executive Board
              </h1>
              <p className="text-xs text-amber-100 max-w-lg leading-relaxed font-medium">
                Analyze department-wide performance, audit faculty logs, download reports, and inspect student records.
              </p>
            </div>

            {/* Global Search box */}
            <div className="relative w-full max-w-sm">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Global student search..."
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowSearchDropdown(e.target.value.length > 0);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/5 text-white text-xs rounded-xl shadow-inner focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Global search drop list */}
              {showSearchDropdown && (
                <div className="absolute left-0 mt-2 w-full max-h-56 overflow-y-auto bg-[#131324] rounded-xl shadow-2xl border border-white/5 z-50 text-left glass-panel-heavy">
                  {matchingSearchStudents.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center font-bold">No student matches.</div>
                  ) : (
                    matchingSearchStudents.map(student => (
                      <div
                        key={student._id}
                        onClick={() => handleOpenStudentDrawer(student.loginId)}
                        className="p-3 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer flex items-center gap-3 transition-colors"
                      >
                        <img src={student.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full bg-slate-950 border border-white/10" />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{student.name}</p>
                          <span className="text-[9px] text-slate-500">{student.loginId} | {student.classOrSubject}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 1. Animated Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-principal flex items-center gap-4.5 hover:scale-[1.01] transition-transform duration-300">
            <div className="p-3 bg-amber-950/40 text-amber-450 border border-amber-500/10 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">Total Students</span>
              <span className="text-2xl font-bold tracking-tight text-white">{students.length}</span>
            </div>
          </div>

          <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-principal flex items-center gap-4.5 hover:scale-[1.01] transition-transform duration-300">
            <div className="p-3 bg-orange-950/40 text-orange-450 border border-orange-500/10 rounded-2xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">Faculty Count</span>
              <span className="text-2xl font-bold tracking-tight text-orange-455">{teachers.length}</span>
            </div>
          </div>

          <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-principal flex items-center gap-4.5 hover:scale-[1.01] transition-transform duration-300">
            <div className="p-3 bg-rose-950/40 text-rose-455 border border-rose-500/10 rounded-2xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">Overall Pass %</span>
              <span className="text-2xl font-bold tracking-tight text-rose-400">{stats.overall.passRate}%</span>
            </div>
          </div>

          <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-principal flex items-center gap-4.5 hover:scale-[1.01] transition-transform duration-300">
            <div className="p-3 bg-indigo-950/40 text-indigo-450 border border-indigo-500/10 rounded-2xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">Graded Exams</span>
              <span className="text-2xl font-bold tracking-tight text-indigo-400">{stats.overall.total}</span>
            </div>
          </div>

        </div>

        {/* 2. Visualizations and leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Recharts Bar (Left 8 Cols) */}
          <div className="lg:col-span-8 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-principal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" /> Department Subject Averages
              </h2>
              <button
                onClick={handleExportCSVReport}
                className="flex items-center gap-1 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" /> Export CSV Report
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subjectAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#131324', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="averageScore" name="Average Class Score %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leaderboard Panel (Right 4 Cols) */}
          <div className="lg:col-span-4 bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-principal flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
                <Trophy className="w-4.5 h-4.5 text-amber-500" /> Leaderboard
              </h2>
              <p className="text-[10px] text-slate-500 mb-4">Top-performing students this semester</p>

              <div className="space-y-3.5">
                {leaderboard.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-500 font-bold">No graded records yet.</p>
                ) : (
                  leaderboard.slice(0, 4).map((student, idx) => {
                    return (
                      <div 
                        key={student.studentId}
                        onClick={() => handleOpenStudentDrawer(student.studentId)}
                        className="p-3 border border-white/5 hover:border-amber-500/20 bg-slate-950/20 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            idx === 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            idx === 1 ? 'bg-slate-500/10 text-slate-350 border border-white/10' :
                            idx === 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-950 text-slate-550'
                          }`}>
                            {idx + 1}
                          </span>
                          <img src={student.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
                          <div>
                            <p className="text-xs font-bold text-slate-205">{student.name}</p>
                            <span className="text-[9px] text-slate-500">{student.studentId}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-amber-405">{student.averagePct}%</span>
                          <div className="flex items-center gap-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-wide block">
                            {student.streak !== 'none' && <Flame className="w-3 h-3 text-rose-500 inline" />}
                            {student.badge}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

        {/* 3. Faculty & Teacher Management */}
        <div className="bg-[#1a1a2e]/30 border border-white/5 rounded-3xl shadow-xl glass-panel glow-border-principal overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/10">
            <div>
              <h2 className="text-md font-bold tracking-wide text-white">Faculty & Teacher Management</h2>
              <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Register new teacher accounts and manage faculty profiles</p>
            </div>

            <button
              onClick={() => setShowTeacherModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-all"
            >
              <GraduationCap className="w-4 h-4" /> Add Teacher Account
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/20 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-4 px-6">Faculty Name</th>
                  <th className="py-4 px-6">Employee ID</th>
                  <th className="py-4 px-6">Assigned Subject</th>
                  <th className="py-4 px-6">Assigned Semester</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-medium">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-slate-500 font-semibold">
                      No teacher accounts registered. Click "Add Teacher Account" to create one.
                    </td>
                  </tr>
                ) : (
                  teachers.map((teach) => (
                    <tr key={teach._id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-6 font-bold flex items-center gap-3">
                        <img
                          src={teach.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${teach.name}`}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full border border-white/10 bg-slate-950/20"
                        />
                        <span className="text-slate-200">{teach.name}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-amber-400 font-bold">
                        {teach.loginId}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-300">
                        {teach.classOrSubject || 'General'}
                      </td>
                      <td className="py-4 px-6 font-semibold">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {teach.assignedSemester || 'Semester 1'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteTeacher(teach.loginId, teach.name)}
                          className="p-2 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all"
                          title="Remove Teacher Profile"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Audit Logs Row */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* Audit Activity Logs */}
          <div className="bg-[#1a1a2e]/30 border border-white/5 p-6 rounded-3xl shadow-xl glass-panel glow-border-principal">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> Faculty Activity Logs
            </h2>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center font-bold">No activity logs recorded yet.</p>
              ) : (
                logs.map(log => (
                  <div key={log._id} className="p-3.5 border border-white/5 rounded-2xl text-xs space-y-1.5 bg-slate-950/20">
                    <div className="flex items-center justify-between text-slate-550 text-[9px] font-bold">
                      <span>{log.userName} ({log.userRole})</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      <span className="font-bold text-amber-500">{log.action}:</span> {log.details}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </motion.main>

      {/* 5. Add Teacher Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setShowTeacherModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-md bg-[#131324] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6 text-left glass-panel-heavy z-10">
            <div>
              <h3 className="text-lg font-bold text-white">
                Register Faculty Teacher Profile
              </h3>
              <p className="text-xs text-slate-500">Add a new teacher to the department. Teacher logs in with password 456.</p>
            </div>

            {teacherFormError && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-455 font-bold">
                {teacherFormError}
              </div>
            )}

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Teacher Full Name</label>
                <input
                  type="text"
                  required
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Prof. Alan Turing"
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Employee ID (Login ID)</label>
                <input
                  type="text"
                  required
                  value={teacherForm.loginId}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, loginId: e.target.value }))}
                  placeholder="e.g. T202"
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Assigned Subject</label>
                <input
                  type="text"
                  required
                  value={teacherForm.classOrSubject}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, classOrSubject: e.target.value }))}
                  placeholder="e.g. Computer Science, Machine Learning, IML..."
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Assigned Semester</label>
                <select
                  value={teacherForm.assignedSemester}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, assignedSemester: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-white/5 bg-slate-950/35 text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="Semester 1" className="bg-[#131324] text-slate-200">Semester 1</option>
                  <option value="Semester 2" className="bg-[#131324] text-slate-200">Semester 2</option>
                  <option value="Semester 3" className="bg-[#131324] text-slate-200">Semester 3</option>
                  <option value="Semester 4" className="bg-[#131324] text-slate-200">Semester 4</option>
                  <option value="Semester 5" className="bg-[#131324] text-slate-200">Semester 5</option>
                  <option value="Semester 6" className="bg-[#131324] text-slate-200">Semester 6</option>
                  <option value="Semester 7" className="bg-[#131324] text-slate-200">Semester 7</option>
                  <option value="Semester 8" className="bg-[#131324] text-slate-200">Semester 8</option>
                  <option value="All Semesters" className="bg-[#131324] text-slate-200">All Semesters</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  Create Teacher Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Student Details Drawer (Read Only) */}
      {activeStudentId && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div onClick={() => setActiveStudentId(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" />
          
          <div className="relative w-full max-w-2xl bg-[#0f0f1a] border-l border-white/5 h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between z-10 glass-panel-heavy">
            {loadingDetails ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
              </div>
            ) : studentDetails ? (
              <div className="space-y-8 text-left">
                {/* Header Profile info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={studentDetails.student.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full bg-slate-955 border border-white/10" />
                    <div>
                      <h3 className="text-xl font-bold text-white">{studentDetails.student.name}</h3>
                      <span className="text-xs text-slate-400">Roll Number: {studentDetails.student.loginId} | Class: {studentDetails.student.classOrSubject}</span>
                    </div>
                  </div>
                  <button onClick={() => setActiveStudentId(null)} className="p-1.5 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score details */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-350 border-b pb-2 border-white/5 uppercase tracking-wider">
                    Grade Ledger (Read-Only)
                  </h4>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {studentDetails.marks.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No grades entered for this student yet.</p>
                    ) : (
                      studentDetails.marks.map((mark) => (
                        <div key={mark._id} className="p-3 bg-slate-950/30 border border-white/5 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-205 block">{mark.subject}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{mark.examType} | {mark.semester}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-300">{mark.marksObtained} / {mark.maxMarks}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Remarks list */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-350 border-b pb-2 border-white/5 uppercase tracking-wider">
                    Faculty Remarks History
                  </h4>
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

                {/* AI performance recommendation summary */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    AI Performance Review Summary
                  </h4>
                  <div className="text-xs space-y-1.5 font-medium leading-relaxed">
                    <p><span className="font-bold text-slate-500">Weekly Focus Suggestion:</span> {studentDetails.recommendations?.weeklyFocus}</p>
                    <p><span className="font-bold text-slate-500">Motivation Quote:</span> {studentDetails.recommendations?.motivation}</p>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
};

export default PrincipalDashboard;
