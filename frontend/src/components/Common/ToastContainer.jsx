import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, AlertTriangle, BookOpen, ShieldAlert, CheckCircle, X } from 'lucide-react';

const icons = {
  marks: <BookOpen className="w-5 h-5 text-indigo-500" />,
  alert: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  'at-risk': <ShieldAlert className="w-5 h-5 text-rose-500" />,
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  announcement: <Bell className="w-5 h-5 text-sky-500" />
};

const backgrounds = {
  marks: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900/50',
  alert: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50',
  'at-risk': 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50',
  success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50',
  announcement: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900/50'
};

const ToastContainer = () => {
  const { toasts, removeToast } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg glass-panel ${backgrounds[toast.type] || backgrounds.announcement}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {icons[toast.type] || icons.announcement}
            </div>
            <div className="flex-grow text-sm font-medium text-slate-800 dark:text-slate-200">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
