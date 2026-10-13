import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ShieldAlert, KeyRound, UserSquare2, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/Common/ThemeToggle';

const roleMeta = {
  Student: {
    accentColor: 'text-cyan-400',
    gradient: 'from-cyan-500 via-teal-500 to-indigo-500',
    glowClass: 'glow-border-student glow-pulse-student',
    shadow: 'shadow-cyan-500/10',
    idLabel: 'Roll Number',
    placeholder: 'e.g. S101',
    illustration: (
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto opacity-70">
        <defs>
          <linearGradient id="studGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="80" r="30" fill="url(#studGrad)" />
        <path d="M50 140c0-25 20-45 45-45h10c25 0 45 20 45 45v20H50v-20z" fill="url(#studGrad)" opacity="0.8" />
        <polygon points="100,30 60,50 100,70 140,50" fill="#0891b2" />
        <rect x="135" y="50" width="4" height="25" fill="#6366f1" />
        <circle cx="137" cy="75" r="4" fill="#6366f1" />
      </svg>
    )
  },
  Teacher: {
    accentColor: 'text-violet-400',
    gradient: 'from-violet-500 via-purple-500 to-pink-500',
    glowClass: 'glow-border-teacher glow-pulse-teacher',
    shadow: 'shadow-violet-500/10',
    idLabel: 'Employee ID',
    placeholder: 'e.g. T201',
    illustration: (
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto opacity-70">
        <defs>
          <linearGradient id="teachGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="100" height="70" rx="10" fill="url(#teachGrad)" />
        <rect x="60" y="60" width="80" height="50" fill="#0f0f1a" opacity="0.9" />
        <line x1="70" y1="75" x2="120" y2="75" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
        <line x1="70" y1="90" x2="110" y2="90" stroke="#ec4899" strokeWidth="4" strokeLinecap="round" />
        <rect x="95" y="120" width="10" height="40" fill="url(#teachGrad)" />
        <rect x="75" y="160" width="50" height="8" rx="4" fill="url(#teachGrad)" />
      </svg>
    )
  },
  Principal: {
    accentColor: 'text-amber-400',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    glowClass: 'glow-border-principal glow-pulse-principal',
    shadow: 'shadow-amber-500/10',
    idLabel: 'Admin ID',
    placeholder: 'e.g. admin',
    illustration: (
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto opacity-70">
        <defs>
          <linearGradient id="adminGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="50" fill="none" stroke="url(#adminGrad)" strokeWidth="6" />
        <polygon points="100,55 115,80 145,80 120,98 130,128 100,110 70,128 80,98 55,80 85,80" fill="url(#adminGrad)" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="url(#adminGrad)" strokeWidth="2" strokeDasharray="5,5" />
      </svg>
    )
  }
};

const Login = () => {
  const { login } = useAuth();
  const [role, setRole] = useState('Student');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wakingServer, setWakingServer] = useState(false);

  const activeMeta = roleMeta[role];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setWakingServer(false);
    setIsSubmitting(true);

    // After 3 s of waiting, show "waking up server" message (Render cold start)
    const wakeTimer = setTimeout(() => setWakingServer(true), 3000);

    try {
      const res = await login(loginId, password, role);
      clearTimeout(wakeTimer);
      setWakingServer(false);
      if (!res.success) {
        setErrorMsg(res.error);
      }
    } catch (err) {
      clearTimeout(wakeTimer);
      setWakingServer(false);
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-100 dark:bg-[#0f0f1a] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* 🌌 Atmospheric Glow Blurs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 dark:bg-indigo-900/10 blur-[150px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 dark:bg-purple-900/10 blur-[150px] pointer-events-none animate-pulse-slow" />

      {/* Floating Theme Button */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Theme
        </span>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/70 dark:bg-white/[0.01] backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-white/5 shadow-2xl relative z-10">
        
        {/* Left Graphics Panel */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-center text-center p-4 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {activeMeta.illustration}
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-wide">
                  Accessing {role} Panel
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Enter your credentials to access your grades ledger, reports, and departmental actions.
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Form Panel */}
        <div className={`md:col-span-7 bg-white/90 dark:bg-[#1a1a2e]/40 backdrop-blur-lg p-8 rounded-2xl border border-slate-200 dark:border-white/5 transition-all duration-300 shadow-xl ${activeMeta.glowClass}`}>
          <div className="flex flex-col space-y-6">
            
            {/* Form Header */}
            <div className="text-center md:text-left space-y-1">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-wider flex items-center justify-center md:justify-start gap-2">
                <GraduationCap className={`w-8 h-8 p-1.5 rounded-lg bg-gradient-to-r ${activeMeta.gradient} text-white`} />
                CDMS PORTAL
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                College Department Management System
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="flex bg-slate-200/70 dark:bg-slate-950/45 p-1 rounded-xl border border-slate-300/40 dark:border-white/5">
              {Object.keys(roleMeta).map((tabRole) => {
                const isActive = role === tabRole;
                return (
                  <button
                    key={tabRole}
                    type="button"
                    onClick={() => {
                      setRole(tabRole);
                      setLoginId('');
                      setPassword('');
                      setErrorMsg('');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 focus:outline-none relative ${
                      isActive 
                        ? `bg-gradient-to-r ${activeMeta.gradient} text-white shadow-md ${activeMeta.shadow}` 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tabRole === 'Student' && <UserSquare2 className="w-3.5 h-3.5" />}
                    {tabRole === 'Teacher' && <GraduationCap className="w-3.5 h-3.5" />}
                    {tabRole === 'Principal' && <KeyRound className="w-3.5 h-3.5" />}
                    {tabRole}
                  </button>
                );
              })}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-950/20 border border-rose-900/40 p-3.5 rounded-xl flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-5 h-5 text-rose-455 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-400 font-semibold leading-relaxed">
                    {errorMsg}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-2">
                  {activeMeta.idLabel}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder={activeMeta.placeholder}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-300 dark:border-white/5 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-300 dark:border-white/5 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Waking Server Banner */}
              <AnimatePresence>
                {wakingServer && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="bg-amber-950/20 border border-amber-700/40 p-3 rounded-xl flex items-center gap-2.5"
                  >
                    <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin flex-shrink-0" />
                    <p className="text-xs text-amber-300 font-semibold leading-relaxed">
                      ⏳ Server is waking up (free tier). This may take up to 60 seconds on the first visit — please wait…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg bg-gradient-to-r ${
                  activeMeta.gradient
                } ${activeMeta.shadow} hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
