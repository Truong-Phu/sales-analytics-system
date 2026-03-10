// ============================================================
// FILE: src/components/layout/Sidebar.jsx
// Navigation + Logout với confirm dialog
// ============================================================
import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/api';
import './Sidebar.css';

const NAV = [
    { section: 'Tổng quan' },
    { to: '/dashboard', icon: '▣', label: 'Dashboard', roles: ['Admin', 'Manager'] },
    { to: '/home', icon: '🏠', label: 'Trang chủ', roles: ['Staff'] },

    { section: 'Dữ liệu bán hàng' },
    { to: '/orders', icon: '📋', label: 'Đơn hàng', roles: ['Admin', 'Manager', 'Staff'], badge: true },
    { to: '/products', icon: '📦', label: 'Sản phẩm', roles: ['Admin', 'Manager', 'Staff'] },
    { to: '/customers', icon: '👥', label: 'Khách hàng', roles: ['Admin', 'Manager', 'Staff'] },
    { to: '/channels', icon: '🏪', label: 'Kênh bán hàng', roles: ['Admin'] },
    { to: '/categories', icon: '🏷', label: 'Danh mục SP', roles: ['Admin'] },

    { section: 'Phân tích & Báo cáo' },
    { to: '/statistics', icon: '📈', label: 'Thống kê', roles: ['Admin', 'Manager'] },
    { to: '/reports', icon: '📄', label: 'Xuất báo cáo', roles: ['Admin', 'Manager'] },

    { section: 'Quản trị hệ thống', adminSection: true },
    { to: '/users', icon: '👤', label: 'Người dùng', roles: ['Admin'] },
    { to: '/pending-users', icon: '⏳', label: 'Duyệt đăng ký', roles: ['Admin'], pendingBadge: true },
    { to: '/logs', icon: '📝', label: 'Nhật ký', roles: ['Admin'] },
];

const ROLE_META = {
    Admin: { color: 'var(--red)', bg: 'rgba(248,113,113,.12)', icon: '🛡', desc: 'Toàn quyền' },
    Manager: { color: 'var(--amber)', bg: 'rgba(251,191,36,.12)', icon: '📊', desc: 'Xem thống kê' },
    Staff: { color: 'var(--blue)', bg: 'rgba(96,165,250,.12)', icon: '🧑‍💼', desc: 'Nhập liệu' },
};

export default function Sidebar({ orderCount }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const role = user?.role || '';
    const meta = ROLE_META[role] || ROLE_META.Staff;

    // Load pending count for Admin
    useEffect(() => {
        if (role === 'Admin') {
            usersApi.getPending()
                .then(r => setPendingCount((r.data || []).length))
                .catch(() => { });
        }
    }, [role]);

    const handleLogout = async () => {
        setLoggingOut(true);
        await logout();
        navigate('/login');
    };

    return (
        <>
            <aside className="sidebar">
                {/* Brand */}
                <div className="sb-brand">
                    <div className="sb-logo">
                        <div className="sb-icon">📊</div>
                        <div>
                            <div className="sb-name">SalesAnalytics</div>
                            <div className="sb-ver">GD1 · v1.0.0</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sb-nav">
                    {NAV.map((item, i) => {
                        if (item.section) {
                            if (item.adminSection && role !== 'Admin') return null;
                            return <div key={i} className="sb-section">{item.section}</div>;
                        }
                        if (!item.roles.includes(role)) return null;
                        return (
                            <NavLink key={item.to} to={item.to} end
                                className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}>
                                <span className="icon">{item.icon}</span>
                                <span className="sb-label">{item.label}</span>
                                {item.badge && orderCount > 0 && <span className="sb-badge">{orderCount}</span>}
                                {item.pendingBadge && pendingCount > 0 && <span className="sb-badge" style={{ background: 'rgba(251,191,36,.2)', color: 'var(--amber)' }}>{pendingCount}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="sb-footer">
                    <div className="sb-role-badge" style={{ background: meta.bg, color: meta.color }}>
                        <span>{meta.icon} {role}</span>
                        <span className="sb-role-desc">{meta.desc}</span>
                    </div>
                    <div className="sb-user">
                        <NavLink to="/profile" className="sb-profile-link">
                            <div className="sb-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                            <div>
                                <div className="sb-uname">{user?.fullName || user?.username}</div>
                                <div className="sb-username">@{user?.username}</div>
                            </div>
                        </NavLink>
                        <button className="sb-logout" onClick={() => setShowConfirm(true)} title="Đăng xuất">
                            ⏏
                        </button>
                    </div>
                </div>
            </aside>

            {/* Logout confirm modal */}
            {showConfirm && (
                <div className="modal-overlay" onClick={() => !loggingOut && setShowConfirm(false)}>
                    <div className="modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <div className="modal-title">Xác nhận đăng xuất</div>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
                                <div style={{ fontSize: 14, marginBottom: 6 }}>
                                    Bạn có chắc muốn đăng xuất?
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                                    Phiên đăng nhập của <strong style={{ color: 'var(--text)' }}>{user?.username}</strong> sẽ kết thúc.
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowConfirm(false)} disabled={loggingOut}>
                                Hủy
                            </button>
                            <button className="btn btn-danger" onClick={handleLogout} disabled={loggingOut}>
                                {loggingOut ? 'Đang xuất...' : '⏏ Đăng xuất'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
