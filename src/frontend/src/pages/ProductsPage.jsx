// ============================================================
// FILE: src/pages/ProductsPage.jsx — UC9
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { productsApi, categoriesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = n => n?.toLocaleString('vi-VN') ?? '—';

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ productName:'', categoryId:'', price:'' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 10;

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await productsApi.getAll({ page, pageSize:PAGE_SIZE, search });
      setItems(r.data?.items || r.data || []);
      setTotal(r.data?.totalCount || r.data?.length || 0);
    } catch { showToast('Lỗi tải sản phẩm','error'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => {
    document.getElementById('page-title-slot').textContent = 'Sản phẩm';
    categoriesApi.getAll().then(r => setCategories(r.data || [])).catch(()=>{});
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ productName:'', categoryId:'', price:'' }); setSelected(null); setModal('form'); };
  const openEdit = (item) => { setForm({ productName:item.productName, categoryId:item.categoryId, price:item.price }); setSelected(item); setModal('form'); };

  const save = async () => {
    if (!form.productName || !form.price) { showToast('Tên và giá sản phẩm là bắt buộc','error'); return; }
    setSaving(true);
    try {
      if (!selected) await productsApi.create(form);
      else await productsApi.update(selected.productId, form);
      showToast(selected ? '✓ Cập nhật thành công' : '✓ Thêm sản phẩm thành công');
      setModal(null); load();
    } catch (e) { showToast(e.response?.data?.message||'Lỗi lưu','error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Xóa sản phẩm này?')) return;
    try { await productsApi.delete(id); showToast('✓ Đã xóa'); load(); }
    catch { showToast('Lỗi xóa','error'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div className="search-wrap" style={{maxWidth:280}}>
          <span className="search-icon">🔍</span>
          <input className="form-input" style={{paddingLeft:36}} placeholder="Tìm sản phẩm..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ Thêm sản phẩm</button>}
      </div>

      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">Danh sách sản phẩm — UC9</span>
          <span style={{fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>{total} sản phẩm</span>
        </div>
        {loading ? <div style={{padding:32,textAlign:'center',color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>// Đang tải...</div> : (
          <table>
            <thead><tr><th>#</th><th>Tên sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
            <tbody>
              {items.map((p,i) => (
                <tr key={p.productId}>
                  <td style={{fontFamily:'Space Mono,monospace',color:'var(--dim)',fontSize:11}}>{String(p.productId).padStart(3,'0')}</td>
                  <td style={{fontWeight:500}}>{p.productName}</td>
                  <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:'rgba(96,165,250,.1)',color:'var(--blue)',fontFamily:'Space Mono,monospace'}}>{p.categoryName||'—'}</span></td>
                  <td style={{fontFamily:'Space Mono,monospace',color:'var(--green3)'}}>{fmt(p.price)} đ</td>
                  <td style={{color:'var(--dim)',fontSize:11}}>{p.createdAt?.slice(0,10)}</td>
                  <td style={{display:'flex',gap:4}}>
                    {isAdmin && <>
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(p)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(p.productId)}>🗑</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pagination">
          {Array.from({length:totalPages},(_,i)=>(
            <button key={i} className={`page-btn${page===i+1?' active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>
          ))}
          <span style={{marginLeft:'auto',fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>Trang {page}/{totalPages||1}</span>
        </div>
      </div>

      {modal === 'form' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">{selected?'✏ Sửa sản phẩm':'📦 Thêm sản phẩm mới'}</div>
              <div className="modal-close" onClick={()=>setModal(null)}>✕</div>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Tên sản phẩm *</label><input className="form-input" placeholder="Tên sản phẩm" value={form.productName} onChange={e=>setForm(f=>({...f,productName:e.target.value}))}/></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Danh mục</label>
                  <select className="form-input" value={form.categoryId} onChange={e=>setForm(f=>({...f,categoryId:e.target.value}))}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c=><option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Giá bán (đ) *</label><input type="number" className="form-input" placeholder="0" value={form.price} onChange={e=>setForm(f=>({...f,price:+e.target.value}))}/></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Đang lưu...':'✓ Lưu'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
