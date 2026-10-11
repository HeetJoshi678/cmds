import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ThemeToggle from './ThemeToggle';
import { Bell, LogOut, BookOpen, AlertTriangle, ShieldAlert, GraduationCap, Calendar, Check } from 'lucide-react';

const notificationIcons = {
  marks: <BookOpen className="w-4 h-4 text-cyan-400" />,
  alert: <AlertTriangle className="w-4 h-4 text-amber-450" />,
  'at-risk': <ShieldAlert className="w-4 h-4 text-rose-450" />,
  announcement: <Bell className="w-4 h-4 text-violet-400" />
};

const getRoleGradient = (role) => {
  if (role === 'Student') return 'from-cyan-500 via-teal-500 to-indigo-500';
  if (role === 'Teacher') return 'from-violet-500 via-purple-500 to-pink-500';
  if (role === 'Principal') return 'from-amber-400 via-orange-500 to-rose-500';
  return 'from-slate-600 to-slate-800';
};

const Navbar = ({ onOpenNotifications }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

  const gradient = getRoleGradient(user?.role);

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#131324]/60 border-b border-slate-200 dark:border-white/5 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-md dark:shadow-xl transition-colors duration-300">
      {/* Brand logo */}
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl bg-gradient-to-tr ${gradient} text-white shadow-md`}>
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-wider text-slate-900 dark:text-white">
            EDUSDMS
          </span>
          <span className="hidden sm:inline-block ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
            v2.0
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Toggle */}
        <div>
          <ThemeToggle />
        </div>

        {/* Notifications center */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-[#0f0f1a] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/5 bg-[#17172c] shadow-2xl overflow-hidden glass-modal z-50">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
                <span className="font-bold text-xs text-white uppercase tracking-wider">Alert Center</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center text-xs text-slate-500">
                    No new alerts.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((noti) => (
                    <div
                      key={noti._id}
                      className={`p-3.5 flex gap-3 hover:bg-white/[0.02] transition-all ${
                        !noti.isRead ? 'bg-white/[0.01]' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {notificationIcons[noti.type] || notificationIcons.announcement}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={`text-xs leading-relaxed text-slate-300 ${!noti.isRead ? 'font-medium text-white' : ''}`}>
                          {noti.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(noti.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      {!noti.isRead && (
                        <button
                          onClick={() => markNotificationAsRead(noti._id)}
                          className="flex-shrink-0 self-center p-1 text-slate-500 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 bg-slate-950/30 border-t border-white/5 text-center">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    if (onOpenNotifications) onOpenNotifications();
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  View All Alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/5">
          <img
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name}`}
            alt="User avatar"
            className="w-9 h-9 rounded-full object-cover border border-white/10 bg-slate-950/20"
          />
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-200 leading-tight">
              {user?.name}
            </p>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">
              {user?.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-455 hover:bg-rose-500/10 rounded-xl transition-all"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
export { getRoleGradient };
