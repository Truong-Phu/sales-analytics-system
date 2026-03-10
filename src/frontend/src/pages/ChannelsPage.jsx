// ============================================================
// FILE: src/pages/ChannelsPage.jsx — UC10
// ============================================================
import { useState, useEffect } from 'react';
import { channelsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ChannelsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ channelName:'' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const load = () => channelsApi.getAll().then(r=>setItems(r.data||[])).catch(()=>showToast('Lỗi tải','error'));

  useEffect(() => { { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Kênh bán hàng'; } load(); }, []);

  const save = async () => {
    if (!form.channelName.trim()) { showToast('Tên kênh là bắt buộc','error'); return; }
    setSaving(true);
    try {
      if (!selected) await channelsApi.create(form);
      else await channelsApi.update(selected.channelId, form);
      showToast('✓ Lưu thành công'); setModal(null); load();
    } catch (e) { showToast(e.response?.data?.message||'Lỗi','error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Xóa kênh bán hàng này?')) return;
    try { await channelsApi.delete(id); showToast('✓ Đã xóa'); load(); }
    catch { showToast('Không thể xóa kênh đang có đơn hàng','error'); }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        {isAdmin&&<button className="btn btn-primary" onClick={()=>{setForm({channelName:''});setSelected(null);setModal('form')}}>+ Thêm kênh</button>}
      </div>
      <div className="card table-wrap">
        <div className="card-header"><span className="card-title">Kênh bán hàng — UC10</span><span style={{fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>{items.length} kênh</span></div>
        <table>
          <thead><tr><th>#</th><th>Tên kênh</th><th>Loại</th><th>Thao tác</th></tr></thead>
          <tbody>
            {items.map(ch=>(
              <tr key={ch.channelId}>
                <td style={{fontFamily:'Space Mono,monospace',color:'var(--dim)',fontSize:11}}>{String(ch.channelId).padStart(2,'0')}</td>
                <td style={{fontWeight:500}}>{ch.channelName}</td>
                <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:'rgba(34,197,94,.1)',color:'var(--green)',fontFamily:'Space Mono,monospace'}}>
                  {['Offline','Cửa hàng'].includes(ch.channelName)?'Offline':'Online'}
                </span></td>
                <td style={{display:'flex',gap:4}}>
                  {isAdmin&&<>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setForm({channelName:ch.channelName});setSelected(ch);setModal('form')}}>✏</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(ch.channelId)}>🗑</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal==='form'&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{width:400}}>
            <div className="modal-head"><div className="modal-title">{selected?'✏ Sửa kênh':'🏪 Thêm kênh bán hàng'}</div><div className="modal-close" onClick={()=>setModal(null)}>✕</div></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Tên kênh *</label><input className="form-input" placeholder="vd: Shopee, TikTok Shop..." value={form.channelName} onChange={e=>setForm(f=>({...f,channelName:e.target.value}))}/></div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setModal(null)}>Hủy</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Đang lưu...':'✓ Lưu'}</button></div>
          </div>
        </div>
      )}
      {toast&&<div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
