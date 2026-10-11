import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 shadow-sm transition-all duration-200 focus:outline-none active:scale-[0.97]"
      title="Toggle Dark / Light Mode"
    >
      {darkMode ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 animate-pulse-slow" />
          <span className="text-xs font-bold tracking-wide">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold tracking-wide">Dark Mode</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
