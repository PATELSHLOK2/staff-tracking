import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import Shifts from './pages/Shifts';
import Tracking from './pages/Tracking';
import Leave from './pages/Leave';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import Communication from './pages/Communication';
import Kiosk from './pages/Kiosk';
import Settings from './pages/Settings';

// Layout wrapper that shows the sidebar + renders child routes via <Outlet>
function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

// Manager-only guard
function ManagerRoute() {
  const { isManager } = useAuth();
  return isManager ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(148,163,184,0.15)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      {/* Protected — all share the sidebar layout */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/leaves" element={<Leave />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/communication" element={<Communication />} />
        <Route path="/kiosk" element={<Kiosk />} />

        {/* Manager-only sub-routes */}
        <Route element={<ManagerRoute />}>
          <Route path="/staff" element={<Staff />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
