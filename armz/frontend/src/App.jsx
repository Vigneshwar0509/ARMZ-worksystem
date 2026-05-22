import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/auth/Login';
import Dashboard from './pages/employee/Dashboard';
import TimeEntry from './pages/employee/TimeEntry';
import MyLeave from './pages/employee/MyLeave';
import TeamView from './pages/manager/TeamView';
import LeaveApprovals from './pages/manager/LeaveApprovals';
import Employees from './pages/admin/Employees';
import Projects from './pages/admin/Projects';
import Reports from './pages/admin/Reports';
import MonthlyEvents from './pages/admin/MonthlyEvents';
import './styles/layout.css';

function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppLayout() {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(open => !open)} aria-label="Toggle navigation">
          ☰
        </button>
        <div className="mobile-brand">
          <div className="logo-icon">✈</div>
          <span>ARMZ Aviation</span>
        </div>
      </div>
      <Sidebar className={sidebarOpen ? 'sidebar-open' : ''} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content" onClick={() => sidebarOpen && setSidebarOpen(false)}>
        <Routes>
          <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/timeentry"   element={<ProtectedRoute><TimeEntry /></ProtectedRoute>} />
          <Route path="/leave"       element={<ProtectedRoute><MyLeave /></ProtectedRoute>} />
          <Route path="/team"        element={<ProtectedRoute roles={['Admin','Manager']}><TeamView /></ProtectedRoute>} />
          <Route path="/leave-admin" element={<ProtectedRoute roles={['Admin','Manager']}><LeaveApprovals /></ProtectedRoute>} />
          <Route path="/employees"   element={<ProtectedRoute roles={['Admin']}><Employees /></ProtectedRoute>} />
          <Route path="/events"      element={<ProtectedRoute roles={['Admin']}><MonthlyEvents /></ProtectedRoute>} />
          <Route path="/projects"    element={<ProtectedRoute roles={['Admin']}><Projects /></ProtectedRoute>} />
          <Route path="/reports"     element={<ProtectedRoute roles={['Admin','Manager']}><Reports /></ProtectedRoute>} />
          <Route path="*"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/*"     element={<AppLayout />} />
    </Routes>
  );
}
