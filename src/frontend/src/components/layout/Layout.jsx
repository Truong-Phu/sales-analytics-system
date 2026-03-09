// ============================================================
// FILE: src/components/layout/Layout.jsx
// ============================================================
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { ordersApi } from '../../services/api';

// Map path → page title
const TITLES = {
  '/dashboard':  'Dashboard',
  '/home':       'Trang chủ',
  '/orders':     'Đơn hàng',
  '/products':   'Sản phẩm',
  '/categories': 'Danh mục sản phẩm',
  '/customers':  'Khách hàng',
  '/channels':   'Kênh bán hàng',
  '/statistics': 'Thống kê',
  '/reports':    'Xuất báo cáo',
  '/users':      'Người dùng',
  '/logs':       'Nhật ký hệ thống',
  '/profile':    'Hồ sơ cá nhân',
};

const ROLE_META = {
  Admin:   { color:'var(--red)',   label:'Admin'   },
  Manager: { color:'var(--amber)', label:'Manager' },
  Staff:   { color:'var(--blue)',  label:'Staff'   },
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [orderCount, setOrderCount] = useState(0);
  const [clock, setClock] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('vi-VN')), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    ordersApi.getAll({ page:1, pageSize:1 })
      .then(r => setOrderCount(r.data?.totalCount || 0))
      .catch(() => {});
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const roleMeta = ROLE_META[user.role] || ROLE_META.Staff;
  // Derive title from path (pages also update via document.getElementById)
  const pathTitle = TITLES[location.pathname] ||
    (location.pathname.startsWith('/orders/') ? 'Chi tiết đơn hàng' : 'SalesAnalytics');

  return (
    <div className="app">
      <Sidebar orderCount={orderCount} />
      <div className="main">
        {/* Top bar */}
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
            <span id="page-title-slot" className="page-title">{pathTitle}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--dim)' }}>{clock}</span>
            <span style={{
              fontFamily:'Space Mono,monospace', fontSize:10,
              padding:'3px 8px', borderRadius:4,
              background: user.role==='Admin'?'rgba(248,113,113,.12)':user.role==='Manager'?'rgba(251,191,36,.12)':'rgba(96,165,250,.12)',
              color: roleMeta.color,
            }}>
              {roleMeta.label}
            </span>
            <span style={{ fontSize:12, color:'var(--dim)' }}>{user.fullName || user.username}</span>
          </div>
        </div>

        {/* Page content */}
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
