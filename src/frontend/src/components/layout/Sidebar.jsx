// ============================================================
// FILE: src/components/layout/Sidebar.jsx
// Navigation hoàn chỉnh — phân quyền chặt chẽ theo 3 role
// ============================================================
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../Sidebar.css';

// Mỗi item chỉ hiện với role được khai báo trong `roles`
const NAV = [
  // ── TỔNG QUAN
  { section: 'Tổng quan' },
  { to:'/dashboard', icon:'▣',  label:'Dashboard',        roles:['Admin','Manager'], tip:'UC5+UC6' },
  { to:'/home',      icon:'🏠', label:'Trang chủ',        roles:['Staff'] },

  // ── DỮ LIỆU BÁN HÀNG
  { section: 'Dữ liệu bán hàng' },
  { to:'/orders',    icon:'📋', label:'Đơn hàng',         roles:['Admin','Manager','Staff'], badge:true },
  { to:'/products',  icon:'📦', label:'Sản phẩm',         roles:['Admin','Manager','Staff'] },
  { to:'/customers', icon:'👥', label:'Khách hàng',       roles:['Admin','Manager','Staff'] },
  { to:'/channels',  icon:'🏪', label:'Kênh bán hàng',    roles:['Admin'] },
  { to:'/categories',icon:'🏷', label:'Danh mục SP',      roles:['Admin'] },

  // ── PHÂN TÍCH (Manager + Admin)
  { section: 'Phân tích & Báo cáo' },
  { to:'/statistics', icon:'📈', label:'Thống kê',        roles:['Admin','Manager'], tip:'UC5' },
  { to:'/reports',    icon:'📄', label:'Xuất báo cáo',    roles:['Admin','Manager'], tip:'UC7' },

  // ── QUẢN TRỊ (Admin only)
  { section: 'Quản trị hệ thống', adminSection:true },
  { to:'/users', icon:'👤', label:'Người dùng',           roles:['Admin'], tip:'UC2' },
  { to:'/logs',  icon:'📝', label:'Nhật ký',              roles:['Admin'], tip:'UC8' },
];

const ROLE_META = {
  Admin:   { color:'var(--red)',   bg:'rgba(248,113,113,.12)', icon:'🛡', desc:'Toàn quyền'   },
  Manager: { color:'var(--amber)', bg:'rgba(251,191,36,.12)',  icon:'📊', desc:'Xem thống kê' },
  Staff:   { color:'var(--blue)',  bg:'rgba(96,165,250,.12)',  icon:'🧑‍💼', desc:'Nhập liệu'   },
};

export default function Sidebar({ orderCount }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || '';
  const meta = ROLE_META[role] || ROLE_META.Staff;

  return (
    <aside className="sidebar">
      {/* ── Brand ── */}
      <div className="sb-brand">
        <div className="sb-logo">
          <div className="sb-icon">📊</div>
          <div>
            <div className="sb-name">SalesAnalytics</div>
            <div className="sb-ver">GD1 · v1.0.0</div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sb-nav">
        {NAV.map((item, i) => {
          // Section heading
          if (item.section) {
            if (item.adminSection && role !== 'Admin') return null;
            return <div key={i} className="sb-section">{item.section}</div>;
          }
          // Hidden for this role
          if (!item.roles.includes(role)) return null;
          return (
            <NavLink key={item.to} to={item.to} end
              className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}>
              <span className="icon">{item.icon}</span>
              <span className="sb-label">{item.label}</span>
              {item.tip && <span className="sb-tip">{item.tip}</span>}
              {item.badge && orderCount > 0 && <span className="sb-badge">{orderCount}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="sb-footer">
        {/* Role badge */}
        <div className="sb-role-badge" style={{ background:meta.bg, color:meta.color }}>
          <span>{meta.icon} {role}</span>
          <span className="sb-role-desc">{meta.desc}</span>
        </div>

        {/* User + profile + logout */}
        <div className="sb-user">
          <NavLink to="/profile" className="sb-profile-link">
            <div className="sb-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <div>
              <div className="sb-uname">{user?.fullName || user?.username}</div>
              <div className="sb-username">@{user?.username}</div>
            </div>
          </NavLink>
          <button className="sb-logout" onClick={() => { logout(); navigate('/login'); }} title="Đăng xuất">
            ⏏
          </button>
        </div>
      </div>
    </aside>
  );
}
