// ============================================================
// FILE: src/pages/StaffHomePage.jsx
// Trang chủ dành riêng cho Staff sau khi đăng nhập
// Hiển thị công việc hằng ngày: nhập đơn, quản lý khách hàng
// ============================================================
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi, customersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = n => n?.toLocaleString('vi-VN') ?? '—';

export default function StaffHomePage() {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [clock, setClock] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Trang chủ'; }
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('vi-VN')), 1000);

    Promise.all([
      ordersApi.getAll({ page: 1, pageSize: 5 }),
      customersApi.getAll({ page: 1, pageSize: 1 }),
    ]).then(([o, c]) => {
      setRecentOrders(o.data?.items || o.data || []);
      setTodayCount(o.data?.totalCount || 0);
      setCustomerCount(c.data?.totalCount || 0);
    }).catch(() => {})
      .finally(() => setLoading(false));

    return () => clearInterval(t);
  }, []);

  const today = new Date().toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const STATUS_BADGE = { completed:'badge-green', pending:'badge-amber', shipping:'badge-blue', cancelled:'badge-red' };

  const quickActions = [
    { icon: '📋', label: 'Tạo đơn hàng mới', desc: 'Tạo và ghi nhận đơn hàng mới', to: '/orders', color: '#22c55e' },
    { icon: '👥', label: 'Thêm khách hàng',  desc: 'Thêm và quản lý khách hàng',        to: '/customers', color: '#60a5fa' },
    { icon: '📦', label: 'Xem sản phẩm',     desc: 'Xem danh sách sản phẩm',         to: '/products', color: '#fbbf24' },
    { icon: '📋', label: 'Quản lý đơn hàng', desc: 'Tìm kiếm, chỉnh sửa đơn hàng',        to: '/orders', color: '#a78bfa' },
  ];

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1a10, #112216)',
        border: '1px solid #1a2a1a',
        borderRadius: 12, padding: '24px 28px', marginBottom: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 80% 50%, rgba(34,197,94,.06), transparent 60%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--green)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>// Chào mừng trở lại</div>
            <div style={{ fontSize:22, fontWeight:600, marginBottom:4 }}>Xin chào, {user?.fullName || user?.username} 👋</div>
            <div style={{ fontSize:13, color:'var(--dim)' }}>{today}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:20, color:'var(--green3)', fontWeight:700 }}>{clock}</div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4, fontFamily:'Space Mono,monospace' }}>// Staff · Nhân viên bán hàng</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { icon:'📋', label:'Tổng đơn trong hệ thống', val: todayCount, color:'var(--green)' },
          { icon:'👥', label:'Tổng khách hàng', val: customerCount, color:'var(--blue)' },
          { icon:'🏪', label:'Kênh bán đang hoạt động', val: 6, color:'var(--amber)' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:12, right:14, fontSize:22, opacity:.2 }}>{s.icon}</div>
            <div style={{ fontSize:10, color:'var(--dim)', fontFamily:'Space Mono,monospace', letterSpacing:'.8px', textTransform:'uppercase', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:700, color:s.color }}>{loading ? '...' : s.val}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>// Thao tác nhanh</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {quickActions.map((a,i) => (
            <Link key={i} to={a.to} style={{ textDecoration:'none' }}>
              <div className="card" style={{ padding:'16px', cursor:'pointer', transition:'all .15s', borderTop:`2px solid ${a.color}` }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                <div style={{ fontSize:22, marginBottom:10 }}>{a.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{a.label}</div>
                <div style={{ fontSize:11, color:'var(--dim)' }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">📋 Đơn hàng gần đây</span>
          <Link to="/orders" style={{ fontSize:11, color:'var(--green)', fontFamily:'Space Mono,monospace', textDecoration:'none' }}>Xem tất cả →</Link>
        </div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>// Đang tải...</div>
        ) : (
          <table>
            <thead><tr><th>Mã ĐH</th><th>Ngày</th><th>Khách hàng</th><th>Kênh</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.orderId}>
                  <td style={{ fontFamily:'Space Mono,monospace', color:'var(--text2)', fontSize:11 }}>#{String(o.orderId).padStart(3,'0')}</td>
                  <td style={{ color:'var(--dim)' }}>{o.orderDate?.slice(0,10)}</td>
                  <td>{o.customerName || '—'}</td>
                  <td><span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, background:'rgba(167,139,250,.1)', color:'var(--purple)', fontFamily:'Space Mono,monospace' }}>{o.channelName}</span></td>
                  <td style={{ fontFamily:'Space Mono,monospace', color:'var(--green3)' }}>{fmt(o.totalAmount)} đ</td>
                  <td><span className={`badge ${STATUS_BADGE[o.status]||'badge-blue'}`}>{o.status}</span></td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--dim)', padding:24, fontFamily:'Space Mono,monospace' }}>// Chưa có đơn hàng nào</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
