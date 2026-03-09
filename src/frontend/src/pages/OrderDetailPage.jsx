// ============================================================
// FILE: src/pages/OrderDetailPage.jsx
// UC4: Chi tiết đơn hàng — trang riêng, không phải panel
// ============================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = n => n?.toLocaleString('vi-VN') ?? '—';
const STATUS_BADGE = { completed:'badge-green', pending:'badge-amber', shipping:'badge-blue', cancelled:'badge-red' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isStaff } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    document.getElementById('page-title-slot').textContent = `Đơn hàng #${id}`;
    ordersApi.getById(id)
      .then(r => setOrder(r.data))
      .catch(() => showToast('Không tìm thấy đơn hàng', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Xóa đơn hàng #${id}?`)) return;
    try {
      await ordersApi.delete(id);
      showToast('✓ Đã xóa đơn hàng');
      setTimeout(() => navigate('/orders'), 1200);
    } catch { showToast('Lỗi xóa đơn hàng', 'error'); }
  };

  if (loading) return <div style={{ padding:40, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>// Đang tải đơn hàng #{id}...</div>;
  if (!order) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
      <div style={{ fontSize:16, color:'var(--text)', marginBottom:8 }}>Không tìm thấy đơn hàng #{id}</div>
      <Link to="/orders" className="btn btn-ghost">← Quay lại danh sách</Link>
    </div>
  );

  const subtotal = order.orderDetails?.reduce((sum, d) => sum + (d.quantity * d.unitPrice), 0) || order.totalAmount;

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Breadcrumb + actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
          <Link to="/orders" style={{ color:'var(--dim)', textDecoration:'none', fontFamily:'Space Mono,monospace' }}>Đơn hàng</Link>
          <span style={{ color:'var(--dim2)' }}>/</span>
          <span style={{ color:'var(--text)', fontFamily:'Space Mono,monospace' }}>#{String(order.orderId).padStart(3,'0')}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isStaff && <Link to={`/orders?edit=${id}`} className="btn btn-ghost">✏ Chỉnh sửa</Link>}
          {isAdmin  && <button className="btn btn-danger" onClick={handleDelete}>🗑 Xóa đơn hàng</button>}
        </div>
      </div>

      {/* Header card */}
      <div className="card card-body" style={{ marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--green)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 }}>// Đơn hàng</div>
          <div style={{ fontSize:26, fontWeight:700, marginBottom:8 }}>#{String(order.orderId).padStart(3,'0')}</div>
          <span className={`badge ${STATUS_BADGE[order.status] || 'badge-blue'}`}>{order.status}</span>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace', marginBottom:4 }}>Tổng giá trị</div>
          <div style={{ fontSize:28, fontWeight:700, color:'var(--green3)', fontFamily:'Space Mono,monospace' }}>{fmt(order.totalAmount)} đ</div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        {/* Customer info */}
        <div className="card card-body">
          <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>// Khách hàng</div>
          {[
            { k:'Họ tên', v: order.customerName || '—' },
            { k:'Điện thoại', v: order.customerPhone || '—' },
            { k:'Email', v: order.customerEmail || '—' },
          ].map((r,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i<2 ? '1px solid rgba(26,42,26,.4)' : 'none', fontSize:12 }}>
              <span style={{ color:'var(--dim)' }}>{r.k}</span>
              <span>{r.v}</span>
            </div>
          ))}
        </div>

        {/* Order info */}
        <div className="card card-body">
          <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>// Thông tin đơn hàng</div>
          {[
            { k:'Ngày đặt', v: order.orderDate?.slice(0,10) },
            { k:'Kênh bán', v: order.channelName },
            { k:'Trạng thái', v: <span className={`badge ${STATUS_BADGE[order.status]||'badge-blue'}`}>{order.status}</span> },
          ].map((r,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i<2 ? '1px solid rgba(26,42,26,.4)' : 'none', fontSize:12 }}>
              <span style={{ color:'var(--dim)' }}>{r.k}</span>
              <span>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Order items */}
      <div className="card table-wrap" style={{ marginBottom:16 }}>
        <div className="card-header">
          <span className="card-title">📦 Chi tiết sản phẩm</span>
          <span style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>{order.orderDetails?.length || 0} mặt hàng</span>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th></tr>
          </thead>
          <tbody>
            {(order.orderDetails || []).map((d, i) => (
              <tr key={d.orderDetailId}>
                <td style={{ fontFamily:'Space Mono,monospace', color:'var(--dim)', fontSize:11 }}>{i+1}</td>
                <td style={{ fontWeight:500 }}>{d.productName}</td>
                <td style={{ fontFamily:'Space Mono,monospace', color:'var(--dim)', fontSize:12 }}>{fmt(d.unitPrice)} đ</td>
                <td style={{ fontFamily:'Space Mono,monospace', textAlign:'center' }}>× {d.quantity}</td>
                <td style={{ fontFamily:'Space Mono,monospace', color:'var(--green3)', fontWeight:600 }}>{fmt(d.quantity * d.unitPrice)} đ</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total row */}
        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:24, fontSize:13 }}>
          <span style={{ color:'var(--dim)' }}>Tổng cộng:</span>
          <span style={{ fontFamily:'Space Mono,monospace', fontWeight:700, color:'var(--green3)', fontSize:18 }}>{fmt(subtotal)} đ</span>
        </div>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <Link to="/orders" className="btn btn-ghost">← Quay lại danh sách</Link>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
