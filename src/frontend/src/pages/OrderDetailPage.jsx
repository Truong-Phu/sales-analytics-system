// FILE: src/pages/OrderDetailPage.jsx
// UC4: Chi tiết đơn hàng — modal chỉnh sửa inline, không navigate
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersApi, customersApi, channelsApi, productsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = n => n?.toLocaleString('vi-VN') ?? '—';
const STATUS_BADGE = { completed: 'badge-green', pending: 'badge-amber', shipping: 'badge-blue', cancelled: 'badge-red' };

export default function OrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin, isStaff } = useAuth();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    // Modal edit state
    const [editOpen, setEditOpen] = useState(false);
    const [form, setForm] = useState({});
    const [newDetail, setNewDetail] = useState({ productId: '', quantity: 1, unitPrice: '' });
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [channels, setChannels] = useState([]);
    const [products, setProducts] = useState([]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadOrder = () => {
        setLoading(true);
        ordersApi.getById(id)
            .then(r => setOrder(r.data))
            .catch(() => showToast('Không tìm thấy đơn hàng', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const t = document.getElementById('page-title-slot');
        if (t) t.textContent = `Đơn hàng #${id}`;
        loadOrder();
        customersApi.getAll({ page: 1, pageSize: 200 }).then(r => setCustomers(r.data?.items || r.data || [])).catch(() => { });
        channelsApi.getAll().then(r => setChannels(r.data || [])).catch(() => { });
        productsApi.getAll({ page: 1, pageSize: 200 }).then(r => setProducts(r.data?.items || r.data || [])).catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const openEdit = () => {
        setForm({
            customerId: order.customerId,
            channelId: order.channelId,
            orderDate: order.orderDate?.slice(0, 10),
            status: order.status,
            note: order.note || '',
            orderDetails: order.orderDetails || [],
        });
        setNewDetail({ productId: '', quantity: 1, unitPrice: '' });
        setEditOpen(true);
    };

    const addDetail = () => {
        if (!newDetail.productId || !newDetail.quantity || !newDetail.unitPrice) return;
        setForm(f => ({ ...f, orderDetails: [...f.orderDetails, { ...newDetail }] }));
        setNewDetail({ productId: '', quantity: 1, unitPrice: '' });
    };

    const onProductChange = (productId) => {
        const p = products.find(x => String(x.productId) === String(productId));
        setNewDetail(d => ({ ...d, productId, unitPrice: p?.price || '' }));
    };

    // Lưu xong → reload chi tiết TẠI CHỖ, không navigate
    const saveEdit = async () => {
        if (!form.channelId || !form.orderDate) {
            showToast('Vui lòng điền đầy đủ thông tin', 'error'); return;
        }
        setSaving(true);
        try {
            await ordersApi.update(id, {
                customerId: form.customerId || null,
                channelId: form.channelId,
                orderDate: form.orderDate,
                status: form.status,
                note: form.note || '',
                items: form.orderDetails.map(d => ({
                    productId: d.productId,
                    quantity: d.quantity,
                    unitPrice: d.unitPrice,
                    discount: d.discount || 0,
                })),
            });
            showToast('✓ Cập nhật đơn hàng thành công');
            setEditOpen(false);
            loadOrder(); // reload chi tiết, KHÔNG redirect ra ngoài
        } catch (e) {
            showToast(e.response?.data?.message || 'Lỗi lưu đơn hàng', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Xóa đơn hàng #${id}?`)) return;
        try {
            await ordersApi.delete(id);
            showToast('✓ Đã xóa đơn hàng');
            setTimeout(() => navigate('/orders'), 1200);
        } catch { showToast('Lỗi xóa đơn hàng', 'error'); }
    };

    if (loading) return (
        <div className="loading-wrap" style={{ padding: 60 }}>
            <div className="spinner" /> Đang tải đơn hàng #{id}...
        </div>
    );
    if (!order) return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>Không tìm thấy đơn hàng #{id}</div>
            <Link to="/orders" className="btn btn-ghost">← Quay lại danh sách</Link>
        </div>
    );

    const subtotal = order.orderDetails?.reduce((s, d) => s + d.quantity * d.unitPrice, 0) || order.totalAmount;

    return (
        <div style={{ maxWidth: 800 }}>

            {/* Breadcrumb + actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Link to="/orders" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Đơn hàng</Link>
                    <span style={{ color: 'var(--text3)' }}>/</span>
                    <span style={{ fontWeight: 600 }}>#{String(order.orderId).padStart(3, '0')}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {isStaff && <button className="btn btn-ghost" onClick={openEdit}>✏ Chỉnh sửa</button>}
                    {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>🗑 Xóa đơn hàng</button>}
                </div>
            </div>

            {/* Header card */}
            <div className="card card-body" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Đơn hàng</div>
                    <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>#{String(order.orderId).padStart(3, '0')}</div>
                    <span className={`badge ${STATUS_BADGE[order.status] || 'badge-blue'}`}>{order.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Tổng giá trị</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--green3)', fontFamily: 'JetBrains Mono,monospace' }}>
                        {fmt(order.totalAmount)} ₫
                    </div>
                </div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="card card-body">
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>Khách hàng</div>
                    {[
                        { k: 'Họ tên', v: order.customerName || '—' },
                        { k: 'Điện thoại', v: order.customerPhone || '—' },
                        { k: 'Email', v: order.customerEmail || '—' },
                    ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                            <span style={{ color: 'var(--text3)' }}>{r.k}</span>
                            <span style={{ fontWeight: 500 }}>{r.v}</span>
                        </div>
                    ))}
                </div>
                <div className="card card-body">
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>Thông tin đơn hàng</div>
                    {[
                        { k: 'Ngày đặt', v: order.orderDate?.slice(0, 10) },
                        { k: 'Kênh bán', v: order.channelName },
                        { k: 'Trạng thái', v: <span className={`badge ${STATUS_BADGE[order.status] || 'badge-blue'}`}>{order.status}</span> },
                    ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                            <span style={{ color: 'var(--text3)' }}>{r.k}</span>
                            <span style={{ fontWeight: 500 }}>{r.v}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order items */}
            <div className="card table-wrap" style={{ marginBottom: 16 }}>
                <div className="card-header">
                    <span className="card-title">📦 Chi tiết sản phẩm</span>
                    <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>{order.orderDetails?.length || 0} mặt hàng</span>
                </div>
                <table>
                    <thead>
                        <tr><th>#</th><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th></tr>
                    </thead>
                    <tbody>
                        {(order.orderDetails || []).map((d, i) => (
                            <tr key={d.orderDetailId}>
                                <td className="td-mono">{i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{d.productName}</td>
                                <td className="td-mono" style={{ color: 'var(--text3)' }}>{fmt(d.unitPrice)} ₫</td>
                                <td className="td-mono" style={{ textAlign: 'center' }}>× {d.quantity}</td>
                                <td className="td-mono" style={{ color: 'var(--green3)', fontWeight: 700 }}>{fmt(d.quantity * d.unitPrice)} ₫</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>Tổng cộng:</span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 800, color: 'var(--green3)', fontSize: 18 }}>{fmt(subtotal)} ₫</span>
                </div>
            </div>

            <Link to="/orders" className="btn btn-ghost">← Quay lại danh sách</Link>

            {/* ══════════ MODAL CHỈNH SỬA INLINE ══════════ */}
            {editOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && setEditOpen(false)}>
                    <div className="modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-head">
                            <div className="modal-title">✏ Sửa đơn hàng #{String(order.orderId).padStart(3, '0')}</div>
                            <div className="modal-close" onClick={() => !saving && setEditOpen(false)}>✕</div>
                        </div>

                        <div className="modal-body">
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Khách hàng</label>
                                    <select className="form-input" value={form.customerId || ''} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                                        <option value="">-- Khách lẻ --</option>
                                        {customers.map(c => <option key={c.customerId} value={c.customerId}>{c.customerName}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kênh bán hàng *</label>
                                    <select className="form-input" value={form.channelId || ''} onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}>
                                        <option value="">-- Chọn kênh --</option>
                                        {channels.map(c => <option key={c.channelId} value={c.channelId}>{c.channelName}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Ngày đặt hàng *</label>
                                    <input type="date" className="form-input" value={form.orderDate || ''} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-input" value={form.status || 'completed'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        {['completed', 'pending', 'shipping', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Chi tiết sản phẩm</label>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                    <select className="form-input" style={{ flex: 2 }} value={newDetail.productId} onChange={e => onProductChange(e.target.value)}>
                                        <option value="">-- Chọn sản phẩm --</option>
                                        {products.map(p => <option key={p.productId} value={p.productId}>{p.productName}</option>)}
                                    </select>
                                    <input type="number" className="form-input" style={{ width: 64 }} placeholder="SL" min={1}
                                        value={newDetail.quantity} onChange={e => setNewDetail(d => ({ ...d, quantity: +e.target.value }))} />
                                    <input type="number" className="form-input" style={{ width: 100 }} placeholder="Đơn giá"
                                        value={newDetail.unitPrice} onChange={e => setNewDetail(d => ({ ...d, unitPrice: +e.target.value }))} />
                                    <button className="btn btn-ghost btn-sm" onClick={addDetail}>+ Thêm</button>
                                </div>

                                {form.orderDetails?.length > 0 && (
                                    <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                        {form.orderDetails.map((d, i) => {
                                            const pName = products.find(p => String(p.productId) === String(d.productId))?.productName || d.productName || `SP #${d.productId}`;
                                            return (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: i < form.orderDetails.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{pName}</span>
                                                        <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 8 }}>× {d.quantity}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--green3)', fontWeight: 600 }}>
                                                            {fmt(d.quantity * d.unitPrice)} ₫
                                                        </span>
                                                        <button className="btn btn-danger btn-sm"
                                                            onClick={() => setForm(f => ({ ...f, orderDetails: f.orderDetails.filter((_, j) => j !== i) }))}>
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', fontSize: 13 }}>
                                            <span style={{ color: 'var(--text3)', marginRight: 12 }}>Tổng:</span>
                                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 800, color: 'var(--green3)' }}>
                                                {fmt(form.orderDetails.reduce((s, d) => s + d.quantity * d.unitPrice, 0))} ₫
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditOpen(false)} disabled={saving}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                                {saving ? '⟳ Đang lưu...' : '✓ Lưu đơn hàng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
