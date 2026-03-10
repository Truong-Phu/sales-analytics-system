// ============================================================
// FILE: src/pages/UsersPage.jsx — UC2
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../services/api';

const ROLE_BADGE = { Admin:'badge-red', Manager:'badge-amber', Staff:'badge-blue' };

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ username:'', fullName:'', email:'', roleId:2, password:'' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 10;

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await usersApi.getAll({ page, pageSize:PAGE_SIZE }); setItems(r.data?.items||r.data||[]); setTotal(r.data?.totalCount||r.data?.length||0); }
    catch { showToast('Lỗi tải danh sách','error'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Người dùng'; } }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.username || !form.fullName) { showToast('Username và họ tên là bắt buộc','error'); return; }
    if (!selected && !form.password) { showToast('Cần nhập mật khẩu cho tài khoản mới','error'); return; }
    setSaving(true);
    try {
      if (!selected) await usersApi.create(form);
      else await usersApi.update(selected.userId, form);
      showToast('✓ Lưu thành công'); setModal(null); load();
    } catch (e) { showToast(e.response?.data?.message||'Lỗi','error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Xóa người dùng này?')) return;
    try { await usersApi.delete(id); showToast('✓ Đã xóa'); load(); }
    catch { showToast('Không thể xóa','error'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        <button className="btn btn-primary" onClick={()=>{setForm({username:'',fullName:'',email:'',roleId:2,password:''});setSelected(null);setModal('form')}}>+ Thêm người dùng</button>
      </div>
      <div className="card table-wrap">
        <div className="card-header"><span className="card-title">Quản lý người dùng — UC2</span><span style={{fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>{total} tài khoản</span></div>
        {loading?<div style={{padding:32,textAlign:'center',color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>// Đang tải...</div>:(
          <table>
            <thead><tr><th>#</th><th>Username</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
            <tbody>
              {items.map(u=>(
                <tr key={u.userId}>
                  <td style={{fontFamily:'Space Mono,monospace',color:'var(--dim)',fontSize:11}}>{String(u.userId).padStart(3,'0')}</td>
                  <td style={{fontFamily:'Space Mono,monospace',fontSize:12,color:'var(--text2)'}}>{u.username}</td>
                  <td style={{fontWeight:500}}>{u.fullName}</td>
                  <td style={{color:'var(--dim)',fontSize:12}}>{u.email||'—'}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.roleName]||'badge-blue'}`}>{u.roleName}</span></td>
                  <td style={{color:'var(--dim)',fontSize:11}}>{u.createdAt?.slice(0,10)}</td>
                  <td style={{display:'flex',gap:4}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setForm({username:u.username,fullName:u.fullName,email:u.email||'',roleId:u.roleId,password:''});setSelected(u);setModal('form')}}>✏</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(u.userId)}>🗑</button>
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
            <div className="modal-head"><div className="modal-title">{selected?'✏ Sửa tài khoản':'👤 Thêm người dùng mới'}</div><div className="modal-close" onClick={()=>setModal(null)}>✕</div></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Username *</label><input className="form-input" placeholder="username" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} disabled={!!selected}/></div>
                <div className="form-group"><label className="form-label">Họ tên *</label><input className="form-input" placeholder="Nguyễn Văn A" value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Vai trò</label>
                  <select className="form-input" value={form.roleId} onChange={e=>setForm(f=>({...f,roleId:+e.target.value}))}>
                    <option value={1}>Admin</option><option value={2}>Staff</option><option value={3}>Manager</option>
                  </select>
                </div>
                {!selected&&<div className="form-group full-col"><label className="form-label">Mật khẩu *</label><input type="password" className="form-input" placeholder="Ít nhất 8 ký tự" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Đang lưu...':'✓ Lưu'}</button></div>
          </div>
        </div>
      )}
      {toast&&<div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
