import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Navbar from '../components/Common/Navbar';
import ToastContainer from '../components/Common/ToastContainer';
import { generateReportCard } from '../utils/pdfGenerator';
import { 
  Award, BookOpen, Calendar, CircleUser, FileDown, 
  Flame, Sparkles, TrendingUp, MessageSquare, GraduationCap, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ student: {}, marks: [], gtuResults: [], remarks: [], recommendations: {} });
  const [selectedSemester, setSelectedSemester] = useState('Semester 1');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/students/profile/${user.loginId}`);
      setData(res.data);
      
      const grades = (res.data.marks || []).map(m => (m.marksObtained / m.maxMarks) * 100);
      const gtuGrades = (res.data.gtuResults || []).map(g => (g.gtuMarks / (g.maxMarks || 100)) * 100);
      const isPass = (grades.length > 0 || gtuGrades.length > 0) && 
                     grades.every(g => g >= 40) && 
                     gtuGrades.every(g => g >= 40);
      if (isPass) {
        triggerConfetti();
      }
    } catch (err) {
      console.error('Error fetching student data:', err);
      addToast('Failed to load profile data.', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.loginId]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#06b6d4', '#3b82f6', '#6366f1']
    });
  };

  const allMarks = data.marks || [];
  const allGTU = data.gtuResults || [];

  // Auto-switch semester if selected has no records
  useEffect(() => {
    const combinedSems = [...new Set([...allMarks.map(m => m.semester), ...allGTU.map(g => g.semester)])].filter(Boolean);
    if (combinedSems.length > 0 && !combinedSems.includes(selectedSemester)) {
      setSelectedSemester(combinedSems[0]);
    }
  }, [data.marks, data.gtuResults]);

  // Filter by semester
  const filteredMarks = allMarks.filter(m => {
    if (!m.semester) return true;
    const sem = m.semester.toString().trim().toLowerCase();
    const sel = selectedSemester.toString().trim().toLowerCase();
    return sem === sel || sem.includes(sel.replace('semester', '').trim());
  });

  const filteredGTU = allGTU.filter(g => {
    if (!g.semester) return true;
    const sem = g.semester.toString().trim().toLowerCase();
    const sel = selectedSemester.toString().trim().toLowerCase();
    return sem === sel || sem.includes(sel.replace('semester', '').trim());
  });

  // Calculate GTU Grade Points & SPI / CGPA
  const gradePointMap = {
    'AA': 10, 'AB': 9, 'BB': 8, 'BC': 7, 'CC': 6, 'CD': 5, 'DD': 4, 'FF': 0
  };

  let totalPoints = 0;
  let totalSubjects = 0;

  filteredMarks.forEach(m => {
    const pct = m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0;
    let pt = 0;
    if (pct >= 85) pt = 10;
    else if (pct >= 75) pt = 9;
    else if (pct >= 65) pt = 8;
    else if (pct >= 55) pt = 7;
    else if (pct >= 45) pt = 6;
    else if (pct >= 40) pt = 5;
    else pt = 0;
    totalPoints += pt;
    totalSubjects++;
  });

  filteredGTU.forEach(g => {
    const gr = (g.gtuGrade || '').toUpperCase().trim();
    const pt = gradePointMap[gr] !== undefined ? gradePointMap[gr] : (g.resultStatus === 'PASS' ? 7 : 0);
    totalPoints += pt;
    totalSubjects++;
  });

  const spi = totalSubjects > 0 ? (totalPoints / totalSubjects) : 0;
  const spiDisplay = spi.toFixed(2);
  const cgpaDisplay = spiDisplay;

  // Combine subject rows for Combined Overall Result Table
  const combinedSubjectsMap = {};
  filteredMarks.forEach(m => {
    const key = m.subject.trim();
    if (!combinedSubjectsMap[key]) combinedSubjectsMap[key] = { subject: m.subject, internal: `${m.marksObtained}/${m.maxMarks}`, internalScore: m.marksObtained, internalMax: m.maxMarks, gtu: 'N/A', gtuGrade: 'N/A' };
    else {
      combinedSubjectsMap[key].internalScore += m.marksObtained;
      combinedSubjectsMap[key].internalMax += m.maxMarks;
      combinedSubjectsMap[key].internal = `${combinedSubjectsMap[key].internalScore}/${combinedSubjectsMap[key].internalMax}`;
    }
  });

  filteredGTU.forEach(g => {
    const key = g.subjectName.trim();
    if (!combinedSubjectsMap[key]) combinedSubjectsMap[key] = { subject: g.subjectName, internal: 'N/A', internalScore: 0, internalMax: 0, gtu: `Grade: ${g.gtuGrade || 'AA'}`, gtuGrade: g.gtuGrade || 'AA' };
    else {
      combinedSubjectsMap[key].gtuGrade = g.gtuGrade || 'AA';
      combinedSubjectsMap[key].gtu = `Grade: ${g.gtuGrade || 'AA'}`;
    }
  });

  const combinedSubjectRows = Object.values(combinedSubjectsMap);

  // Semesters List
  const semesters = [...new Set([...allMarks.map(m => m.semester), ...allGTU.map(g => g.semester)])].filter(Boolean);
  if (semesters.length === 0) semesters.push('Semester 1');

  // SVG Ring based on SPI (scale 0-10)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((spi / 10)) * circumference;

  const handleDownloadPDF = () => {
    if (allMarks.length === 0 && allGTU.length === 0) {
      addToast('No marks available to print.', 'alert');
      return;
    }
    generateReportCard(
      data.student?.name ? data.student : { ...data.student, name: user?.name }, 
      allMarks, 
      allGTU, 
      data.remarks
    );
    addToast('Official Government Polytechnic Gandhinagar Transcript downloaded!', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading student desk...</span>
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
        
        {/* Welcome Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 p-8 text-white shadow-xl glow-pulse-student">
          <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] rounded-full bg-white/10 skew-x-12 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="inline-block px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/20">
                GOVERNMENT POLYTECHNIC GANDHINAGAR
              </span>
              <h1 className="text-3xl font-extrabold tracking-wide">
                Welcome, {data.student?.name || user?.name || 'Student'}!
              </h1>
              <p className="text-xs text-cyan-50 max-w-lg leading-relaxed font-medium">
                Official Academic Desk: Continuous Assessment, GTU Examination Grades, and SPI / CGPA Evaluation.
              </p>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-slate-950 text-cyan-400 font-bold text-xs shadow-lg hover:bg-slate-900 active:scale-[0.98] border border-cyan-500/20 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Download Report Card (PDF)
            </button>
          </div>
        </div>

        {/* Dash Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left 8 Cols: Combined Results, GTU Results & Internal Marks */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. Combined Overall Subject-Wise Result Table */}
            <div className="bg-[#1a1a2e]/30 border border-white/5 rounded-3xl shadow-xl overflow-hidden glass-panel glow-border-student">
              <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-950/40 text-cyan-400 border border-cyan-500/10">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-md font-bold tracking-wide">Combined Academic Performance</h2>
                    <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Internal Continuous Assessment & GTU Grades</p>
                  </div>
                </div>

                {/* Semester Selector */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-white/5 bg-slate-950/30 text-slate-350 focus:outline-none"
                  >
                    {semesters.map((sem) => (
                      <option key={sem} value={sem} className="bg-[#131324] text-slate-200">
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Combined Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/20 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6">Internal Marks</th>
                      <th className="py-4 px-6">GTU Grade</th>
                      <th className="py-4 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-medium">
                    {combinedSubjectRows.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-12 text-center text-slate-500 font-semibold">
                          No grade records found for {selectedSemester}.
                        </td>
                      </tr>
                    ) : (
                      combinedSubjectRows.map((row, idx) => {
                        const isPass = row.gtuGrade !== 'FF';
                        return (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-6 font-bold text-slate-200">
                              {row.subject}
                            </td>
                            <td className="py-4 px-6 text-slate-300 font-mono">
                              {row.internal}
                            </td>
                            <td className="py-4 px-6 text-cyan-400 font-mono font-bold">
                              {row.gtu}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                isPass 
                                  ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                              }`}>
                                {isPass ? 'PASS' : 'FAIL'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. GTU Examination Results Card (Grade Only - No Marks) */}
            <div className="bg-[#1a1a2e]/30 border border-white/5 rounded-3xl shadow-xl overflow-hidden glass-panel glow-border-student">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-950/40 text-teal-400 border border-teal-500/10">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-md font-bold tracking-wide">GTU Examination Results</h2>
                    <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Official University Board Grades</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/20 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-4 px-6">Subject Code & Name</th>
                      <th className="py-4 px-6">Semester</th>
                      <th className="py-4 px-6">GTU Grade</th>
                      <th className="py-4 px-6 text-right">Result Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-medium">
                    {filteredGTU.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-500 font-semibold">
                          No GTU Board examination records published yet for {selectedSemester}.
                        </td>
                      </tr>
                    ) : (
                      filteredGTU.map((gtu) => (
                        <tr key={gtu._id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-200">
                            <span className="font-mono text-cyan-400 mr-2 text-[11px]">{gtu.subjectCode}</span>
                            {gtu.subjectName}
                          </td>
                          <td className="py-4 px-6 text-slate-400">
                            {gtu.semester}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 rounded-lg font-extrabold text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                              {gtu.gtuGrade || 'AA'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              gtu.resultStatus === 'PASS' && gtu.gtuGrade !== 'FF'
                                ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                            }`}>
                              {gtu.gtuGrade === 'FF' ? 'FAIL' : (gtu.resultStatus || 'PASS')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Internal Continuous Evaluation Card */}
            <div className="bg-[#1a1a2e]/30 border border-white/5 rounded-3xl shadow-xl overflow-hidden glass-panel glow-border-student">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-950/40 text-indigo-400 border border-indigo-500/10">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-md font-bold tracking-wide">Internal Continuous Evaluation</h2>
                    <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Midterm & Class Tests</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/20 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6">Exam Type</th>
                      <th className="py-4 px-6">Score</th>
                      <th className="py-4 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-medium">
                    {filteredMarks.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-500 font-semibold">
                          No internal test records for {selectedSemester}.
                        </td>
                      </tr>
                    ) : (
                      filteredMarks.map((mark) => {
                        const pct = (mark.marksObtained / mark.maxMarks) * 100;
                        const isPass = pct >= 40;
                        return (
                          <tr key={mark._id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-6 font-bold text-slate-200">
                              {mark.subject}
                            </td>
                            <td className="py-4 px-6 text-slate-400">
                              {mark.examType}
                            </td>
                            <td className="py-4 px-6 font-mono">
                              <span className="font-bold text-slate-100">{mark.marksObtained}</span> <span className="text-slate-600">/ {mark.maxMarks}</span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                isPass 
                                  ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                              }`}>
                                {isPass ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teacher Remarks Card */}
            <div className="bg-[#1a1a2e]/30 border border-white/5 rounded-3xl p-6 shadow-xl glass-panel glow-border-student">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="p-2 rounded-lg bg-pink-950/40 text-pink-400 border border-pink-500/10">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-md font-bold tracking-wide">Faculty Observations & Remarks</h2>
                  <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Teacher notes</p>
                </div>
              </div>

              <div className="space-y-4">
                {data.remarks.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 text-xs font-semibold">No faculty comments posted yet.</p>
                ) : (
                  data.remarks.map((rem) => (
                    <div key={rem._id} className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <CircleUser className="w-3.5 h-3.5" />
                          {rem.teacherName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(rem.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        "{rem.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right 4 Cols: Performance Ring & Student Details */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* SPI & CGPA Standing Card */}
            <div className="bg-[#1a1a2e]/30 border border-white/5 rounded-3xl p-6 shadow-xl text-center space-y-6 glass-panel glow-border-student">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Academic Index (GTU Scale)
              </div>

              {/* Progress Ring */}
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="text-cyan-400 transition-all duration-1000 ease-out"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    {spiDisplay}
                  </span>
                  <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">SPI (out of 10)</span>
                </div>
              </div>

              {/* SPI & CGPA Cards */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5 text-left">
                <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Semester SPI</span>
                  <span className="text-xl font-black text-cyan-400">{spiDisplay}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block">Scale 10.0</span>
                </div>
                <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Cumulative CGPA</span>
                  <span className="text-xl font-black text-emerald-400">{cgpaDisplay}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block">Scale 10.0</span>
                </div>
              </div>
            </div>

            {/* Profile Info Card */}
            <div className="bg-[#1a1a2e]/30 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4 glass-panel glow-border-student">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <img 
                  src={data.student?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.loginId}`} 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full border border-white/10 bg-slate-950/40"
                />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{data.student?.name || user?.name}</h3>
                  <span className="text-xs text-slate-500 block font-mono">Roll: {data.student?.loginId || user?.loginId}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Institute:</span>
                  <span className="font-bold text-slate-200 text-right text-[11px]">GP Gandhinagar</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Class / Branch:</span>
                  <span className="font-bold text-slate-200">{data.student?.classOrSubject || 'Computer Engineering'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Current Status:</span>
                  <span className={`font-bold font-mono ${spi >= 4 ? 'text-emerald-450' : 'text-rose-450'}`}>
                    {spi >= 4 ? 'PASSED' : 'FAIL / ARREARS'}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </motion.main>
    </div>
  );
};

export default StudentDashboard;
