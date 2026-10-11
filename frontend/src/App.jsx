import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import PrincipalDashboard from './pages/PrincipalDashboard';

const DashboardRouter = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-650 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Restoring session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to the appropriate role-based dashboard panel
  switch (user.role) {
    case 'Student':
      return <StudentDashboard />;
    case 'Teacher':
      return <TeacherDashboard />;
    case 'Principal':
      return <PrincipalDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const LoginGuard = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />
            <Route path="/*" element={<DashboardRouter />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
