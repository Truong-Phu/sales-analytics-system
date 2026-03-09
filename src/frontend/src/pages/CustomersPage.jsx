// FILE: src/pages/CustomersPage.jsx — UC11
import { useState, useEffect, useCallback } from 'react';
import { customersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CustomersPage() {
  const { isAdmin, isStaff } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ customerName:'', phone:'', email:'' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 10;

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await customersApi.getAll({ page, pageSize:PAGE_SIZE, search }); setItems(r.data?.items||r.data||[]); setTotal(r.data?.totalCount||r.data?.length||0); }
    catch { showToast('Lỗi tải danh sách','error'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { document.getElementById('page-title-slot').textContent = 'Khách hàng'; }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.customerName) { showToast('Tên khách hàng là bắt buộc','error'); return; }
    setSaving(true);
    try {
      if (!selected) await customersApi.create(form);
      else await customersApi.update(selected.customerId, form);
      showToast(selected?'✓ Cập nhật thành công':'✓ Thêm khách hàng thành công');
      setModal(null); load();
    } catch (e) { showToast(e.response?.data?.message||'Lỗi','error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Xóa khách hàng này?')) return;
    try { await customersApi.delete(id); showToast('✓ Đã xóa'); load(); }
    catch { showToast('Lỗi xóa','error'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div className="search-wrap" style={{maxWidth:280}}>
          <span className="search-icon">🔍</span>
          <input className="form-input" style={{paddingLeft:36}} placeholder="Tìm khách hàng..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
        </div>
        {isStaff && <button className="btn btn-primary" onClick={()=>{setForm({customerName:'',phone:'',email:''});setSelected(null);setModal('form')}}>+ Thêm khách hàng</button>}
      </div>
      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">Danh sách khách hàng — UC11</span>
          <span style={{fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>{total} khách hàng</span>
        </div>
        {loading ? <div style={{padding:32,textAlign:'center',color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>// Đang tải...</div> : (
          <table>
            <thead><tr><th>#</th><th>Họ tên</th><th>Số điện thoại</th><th>Email</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
            <tbody>
              {items.map(c=>(
                <tr key={c.customerId}>
                  <td style={{fontFamily:'Space Mono,monospace',color:'var(--dim)',fontSize:11}}>{String(c.customerId).padStart(3,'0')}</td>
                  <td style={{fontWeight:500}}>{c.customerName}</td>
                  <td style={{fontFamily:'Space Mono,monospace',fontSize:12}}>{c.phone||'—'}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{c.email||'—'}</td>
                  <td style={{color:'var(--dim)',fontSize:11}}>{c.createdAt?.slice(0,10)}</td>
                  <td style={{display:'flex',gap:4}}>
                    {isStaff&&<button className="btn btn-ghost btn-sm" onClick={()=>{setForm({customerName:c.customerName,phone:c.phone||'',email:c.email||''});setSelected(c);setModal('form')}}>✏</button>}
                    {isAdmin&&<button className="btn btn-danger btn-sm" onClick={()=>del(c.customerId)}>🗑</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pagination">
          {Array.from({length:totalPages},(_,i)=><button key={i} className={`page-btn${page===i+1?' active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>)}
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>Trang {page}/{totalPages||1}</span>
        </div>
      </div>
      {modal==='form'&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">{selected?'✏ Sửa khách hàng':'👥 Thêm khách hàng mới'}</div><div className="modal-close" onClick={()=>setModal(null)}>✕</div></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Họ tên *</label><input className="form-input" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))}/></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Số điện thoại</label><input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Đang lưu...':'✓ Lưu'}</button>
            </div>
          </div>
        </div>
      )}
      {toast&&<div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
