// ============================================================
// FILE: src/pages/OrdersPage.jsx — UC3 + UC4
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi, customersApi, channelsApi, productsApi, downloadBlob, statisticsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = { completed:'badge-green', pending:'badge-amber', shipping:'badge-blue', cancelled:'badge-red' };
const fmt    = n => n?.toLocaleString('vi-VN') ?? '—';
const fmtRev = n => n == null ? '—' : Math.round(n).toLocaleString('vi-VN');

export default function OrdersPage() {
  const { isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [kpiRevenue, setKpiRevenue] = useState(null); // doanh thu theo filter
  const [kpiShipping, setKpiShipping] = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [channelId, setChannelId] = useState('');
  const [status, setStatus]       = useState('');
  const [fromDate, setFromDate]   = useState('');
  const [toDate, setToDate]       = useState('');

  const [channels, setChannels]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts]   = useState([]);

  // Modal state
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const [form, setForm] = useState({ customerId:'', channelId:'', orderDate:'', status:'completed', orderDetails:[] });
  const [newDetail, setNewDetail] = useState({ productId:'', quantity:1, unitPrice:'' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const PAGE_SIZE = 10;

  const showToast = (msg, type='success') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      const r = await ordersApi.getAll({ page, pageSize: PAGE_SIZE, search, channelId: channelId||undefined, status: status||undefined, fromDate, toDate });
      setOrders(r.data.items || r.data);
      setTotal(r.data.totalCount || r.data.length || 0);
      // Lấy KPI doanh thu theo filter hiện tại
      statisticsApi.getSummaryReport({ fromDate, toDate, channelId: channelId||undefined })
        .then(sr => {
          setKpiRevenue(sr.data?.kpi?.totalRevenue ?? null);
          const allOrders = sr.data?.kpi?.totalOrdersAll ?? 0;
          const completed = sr.data?.kpi?.totalOrdersCompleted ?? 0;
          setKpiShipping(allOrders - completed);
        }).catch(() => {});
    } catch { showToast('Không tải được danh sách đơn hàng', 'error'); }
    finally { setLoading(false); }
  }, [page, search, channelId, status, fromDate, toDate]);

  useEffect(() => {
    { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Đơn hàng'; }
    Promise.all([
      channelsApi.getAll(),
      customersApi.getAll({ pageSize: 500 }),
      productsApi.getAll({ pageSize: 500, isActive: true }),
    ]).then(([ch, cu, pr]) => {
      setChannels(ch.data?.items || ch.data || []);
      setCustomers(cu.data?.items || cu.data || []);
      setProducts(pr.data?.items || pr.data || []);
    });
    // Lấy khoảng ngày từ DB để init filter
    statisticsApi.getDateRange().then(r => {
      setFromDate(r.data.minDate);
      setToDate(r.data.maxDate);
    }).catch(() => { setFromDate('2025-01-01'); setToDate('2025-12-31'); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ customerId:'', channelId:'', orderDate: new Date().toISOString().slice(0,10), status:'completed', orderDetails:[] });
    setModal('create');
  };

  const openEdit = (order) => {
    setForm({
      customerId: order.customerId,
      channelId: order.channelId,
      orderDate: order.orderDate?.slice(0,10),
      status: order.status,
      orderDetails: order.orderDetails || [],
    });
    setSelected(order);
    setModal('edit');
  };

  const addDetail = () => {
    if (!newDetail.productId || !newDetail.quantity || !newDetail.unitPrice) return;
    setForm(f => ({ ...f, orderDetails: [...f.orderDetails, { ...newDetail }] }));
    setNewDetail({ productId:'', quantity:1, unitPrice:'' });
  };

  const save = async () => {
    if (!form.customerId || !form.channelId || !form.orderDate) { showToast('Vui lòng điền đầy đủ thông tin','error'); return; }
    if (form.orderDetails.length === 0) { showToast('Cần ít nhất 1 sản phẩm','error'); return; }
    setSaving(true);
    try {
      if (modal === 'create') await ordersApi.create(form);
      else await ordersApi.update(selected.orderId, form);
      showToast(modal === 'create' ? '✓ Tạo đơn hàng thành công' : '✓ Cập nhật thành công');
      setModal(null); load();
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi lưu đơn hàng','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa đơn hàng này?')) return;
    try { await ordersApi.delete(id); showToast('✓ Đã xóa đơn hàng'); load(); }
    catch { showToast('Lỗi khi xóa','error'); }
  };

  const exportExcel = async () => {
    try {
      const r = await statisticsApi.exportExcel({ fromDate, toDate });
      downloadBlob(r.data, `BaoCao_${fromDate}_${toDate}.xlsx`);
    } catch { showToast('Lỗi xuất Excel','error'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Stats strip */}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        {[
          {label:'Tổng đơn', val: total, color:'var(--green)'},
          {label:'Doanh thu', val: kpiRevenue != null ? fmtRev(kpiRevenue)+' VNĐ' : '…', color:'var(--green3)'},
          {label:'Chưa hoàn thành', val: kpiShipping > 0 ? kpiShipping : '—', color:'var(--blue)'},
        ].map((s,i)=>(
          <div key={i} className="card" style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:s.color}}/>
            <div style={{fontSize:11,color:'var(--dim)'}}>
              {s.label}<br/><strong style={{fontSize:16,color:'var(--text)'}}>{s.val}</strong>
            </div>
          </div>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <button className="btn btn-export" onClick={exportExcel}>⬇ Xuất Excel</button>
          {isStaff && <button className="btn btn-primary" onClick={openCreate}>+ Tạo đơn hàng</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div className="search-wrap" style={{minWidth:220}}>
          <span className="search-icon">🔍</span>
          <input className="form-input" style={{paddingLeft:36}} placeholder="Tìm đơn hàng..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
        </div>
        <select className="form-input" style={{width:140}} value={channelId} onChange={e=>{setChannelId(e.target.value);setPage(1)}}>
          <option value="">Tất cả kênh</option>
          {channels.map(c=><option key={c.channelId} value={c.channelId}>{c.channelName}</option>)}
        </select>
        <select className="form-input" style={{width:140}} value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
          <option value="">Tất cả trạng thái</option>
          {['completed','pending','shipping','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="form-input" style={{width:140}} value={fromDate} onChange={e=>setFromDate(e.target.value)}/>
        <input type="date" className="form-input" style={{width:140}} value={toDate} onChange={e=>setToDate(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">Danh sách đơn hàng</span>
          <span style={{fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>{total} đơn</span>
        </div>
        {loading ? <div style={{padding:32,textAlign:'center',color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>// Đang tải...</div> : (
          <table>
            <thead><tr><th>Mã ĐH</th><th>Ngày</th><th>Khách hàng</th><th>Kênh</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.orderId} onClick={()=>navigate(`/orders/${o.orderId}`)}>
                  <td style={{fontFamily:'Space Mono,monospace',color:'var(--text2)',fontSize:11}}>#{String(o.orderId).padStart(3,'0')}</td>
                  <td style={{color:'var(--dim)'}}>{o.orderDate?.slice(0,10)}</td>
                  <td>{o.customerName || '—'}</td>
                  <td><span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:10,background:'rgba(167,139,250,.1)',color:'var(--purple)',fontFamily:'Space Mono,monospace'}}>{o.channelName}</span></td>
                  <td style={{fontFamily:'Space Mono,monospace',color:'var(--green3)'}}>{fmt(o.totalAmount)} VNĐ</td>
                  <td><span className={`badge ${STATUS_BADGE[o.status]||'badge-blue'}`}>{o.status}</span></td>
                  <td onClick={e=>e.stopPropagation()} style={{display:'flex',gap:4}}>
                    {isStaff && <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(o)}>✏</button>}
                    {isAdmin && <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(o.orderId)}>🗑</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pagination">
          {Array.from({length:totalPages},(_, i)=>(
            <button key={i} className={`page-btn${page===i+1?' active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>
          ))}
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>
            {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,total)} / {total}
          </span>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{width:600}}>
            <div className="modal-head">
              <div className="modal-title">{modal==='create'?'📋 Tạo đơn hàng mới':'✏ Sửa đơn hàng'}</div>
              <div className="modal-close" onClick={()=>setModal(null)}>✕</div>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Khách hàng</label>
                  <select className="form-input" value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))}>
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map(c=><option key={c.customerId} value={c.customerId}>{c.customerName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kênh bán hàng</label>
                  <select className="form-input" value={form.channelId} onChange={e=>setForm(f=>({...f,channelId:e.target.value}))}>
                    <option value="">-- Chọn kênh --</option>
                    {channels.map(c=><option key={c.channelId} value={c.channelId}>{c.channelName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày đặt hàng</label>
                  <input type="date" className="form-input" value={form.orderDate} onChange={e=>setForm(f=>({...f,orderDate:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {['completed','pending','shipping','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="divider"/>
              <label className="form-label" style={{marginBottom:10,display:'block'}}>Chi tiết sản phẩm</label>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:8,marginBottom:8}}>
                <select className="form-input" value={newDetail.productId} onChange={e=>setNewDetail(d=>({...d,productId:e.target.value}))}>
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map(p=><option key={p.productId} value={p.productId}>{p.productName}</option>)}
                </select>
                <input type="number" className="form-input" placeholder="SL" min={1} value={newDetail.quantity} onChange={e=>setNewDetail(d=>({...d,quantity:+e.target.value}))}/>
                <input type="number" className="form-input" placeholder="Đơn giá" value={newDetail.unitPrice} onChange={e=>setNewDetail(d=>({...d,unitPrice:+e.target.value}))}/>
                <button className="btn btn-ghost" onClick={addDetail}>+</button>
              </div>
              {form.orderDetails.map((d,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'rgba(34,197,94,.04)',border:'1px solid rgba(34,197,94,.1)',borderRadius:6,marginBottom:4,fontSize:12}}>
                  <span>SP #{d.productId} × {d.quantity}</span>
                  <span style={{color:'var(--green3)',fontFamily:'Space Mono,monospace'}}>{fmt(d.quantity*d.unitPrice)} VNĐ</span>
                  <button className="btn btn-danger btn-sm" onClick={()=>setForm(f=>({...f,orderDetails:f.orderDetails.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Đang lưu...':'✓ Lưu đơn hàng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
