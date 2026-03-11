// ============================================================
// FILE: src/App.jsx — Routes đầy đủ cho 3 Actor
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

// Pages
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import DashboardPage    from './pages/DashboardPage';
import StaffHomePage    from './pages/StaffHomePage';
import OrdersPage       from './pages/OrdersPage';
import OrderDetailPage  from './pages/OrderDetailPage';
import ProductsPage     from './pages/ProductsPage';
import CategoriesPage   from './pages/CategoriesPage';
import CustomersPage    from './pages/CustomersPage';
import ChannelsPage     from './pages/ChannelsPage';
import StatisticsPage   from './pages/StatisticsPage';
import ReportsPage      from './pages/ReportsPage';
import UsersPage        from './pages/UsersPage';
import PendingUsersPage from './pages/PendingUsersPage';
import LogsPage         from './pages/LogsPage';
import ProfilePage      from './pages/ProfilePage';
import ImportPage       from './pages/ImportPage';

// ─── Protected Route helper ───────────────────────────────
function ProtectedRoute({ children, adminOnly=false, managerOnly=false }) {
  const { user, isAdmin, isManager } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly   && !isAdmin)   return <Forbidden msg="Chỉ Admin mới truy cập được trang này." />;
  if (managerOnly && !isManager) return <Forbidden msg="Chỉ Admin và Manager mới truy cập được trang này." />;
  return children;
}

function Forbidden({ msg }) {
  return (
    <div style={{ padding:60, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>⛔</div>
      <div style={{ fontSize:16, color:'var(--red)', marginBottom:8 }}>{msg}</div>
      <div style={{ fontSize:12, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>// Vui lòng liên hệ Admin để được cấp quyền.</div>
    </div>
  );
}

// ─── Smart root redirect theo role ───────────────────────
function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Staff') return <Navigate to="/home" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── Routes ──────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={user ? <RootRedirect /> : <LoginPage />} />
      <Route path="/register" element={user ? <RootRedirect /> : <RegisterPage />} />

      {/* App shell */}
      <Route element={<Layout />}>
        {/* Root → redirect theo role */}
        <Route index element={<RootRedirect />} />

        {/* ── ADMIN + MANAGER: Dashboard ── */}
        <Route path="/dashboard"
          element={<ProtectedRoute managerOnly><DashboardPage /></ProtectedRoute>} />

        {/* ── STAFF: Trang chủ ── */}
        <Route path="/home"
          element={<ProtectedRoute><StaffHomePage /></ProtectedRoute>} />

        {/* ── ORDERS (tất cả roles) ── */}
        <Route path="/orders"
          element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
        <Route path="/orders/:id"
          element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

        {/* ── PRODUCTS (tất cả xem, Admin CRUD) ── */}
        <Route path="/products"
          element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />

        {/* ── CATEGORIES (Admin only) ── */}
        <Route path="/categories"
          element={<ProtectedRoute adminOnly><CategoriesPage /></ProtectedRoute>} />

        {/* ── CUSTOMERS (tất cả) ── */}
        <Route path="/customers"
          element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />

        {/* ── CHANNELS (Admin only) ── */}
        <Route path="/channels"
          element={<ProtectedRoute adminOnly><ChannelsPage /></ProtectedRoute>} />

        {/* ── STATISTICS (Admin + Manager) ── */}
        <Route path="/statistics"
          element={<ProtectedRoute managerOnly><StatisticsPage /></ProtectedRoute>} />

        {/* ── REPORTS (Admin + Manager) — trang riêng UC7 ── */}
        <Route path="/reports"
          element={<ProtectedRoute managerOnly><ReportsPage /></ProtectedRoute>} />

        {/* ── USERS (Admin only) ── */}
        <Route path="/users"
          element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />

        {/* ── PENDING APPROVALS (Admin only) ── */}
        <Route path="/pending-users"
          element={<ProtectedRoute adminOnly><PendingUsersPage /></ProtectedRoute>} />

        {/* ── LOGS (Admin only) ── */}
        <Route path="/logs"
          element={<ProtectedRoute adminOnly><LogsPage /></ProtectedRoute>} />

        {/* ── IMPORT (Admin + Staff) ── */}
        <Route path="/import"
          element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />

        {/* ── PROFILE (tất cả) ── */}
        <Route path="/profile"
          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
