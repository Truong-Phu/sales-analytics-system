// ============================================================
// FILE: src/pages/CategoriesPage.jsx
// Quản lý danh mục sản phẩm — Admin only
// API: GET/POST/DELETE /api/categories
// ============================================================
import { useState, useEffect } from 'react';
import { categoriesApi } from '../services/api';

export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ categoryName: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const load = async () => {
    setLoading(true);
    try { const r = await categoriesApi.getAll(); setItems(r.data || []); }
    catch { showToast('Lỗi tải danh mục', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { document.getElementById('page-title-slot').textContent = 'Danh mục sản phẩm'; load(); }, []);

  const save = async () => {
    if (!form.categoryName.trim()) { showToast('Tên danh mục là bắt buộc', 'error'); return; }
    setSaving(true);
    try {
      await categoriesApi.create(form);
      showToast('✓ Thêm danh mục thành công');
      setModal(false); setForm({ categoryName: '' }); load();
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Xóa danh mục này? Các sản phẩm thuộc danh mục sẽ không bị xóa.')) return;
    try { await categoriesApi.delete(id); showToast('✓ Đã xóa danh mục'); load(); }
    catch { showToast('Không thể xóa danh mục đang có sản phẩm', 'error'); }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>
          {/* Quản lý danh mục sản phẩm — liên kết với UC9 */}
        </div>
        <button className="btn btn-primary" onClick={()=>{ setForm({categoryName:''}); setModal(true); }}>+ Thêm danh mục</button>
      </div>

      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">Danh mục sản phẩm</span>
          <span style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>{items.length} danh mục</span>
        </div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>{/* Đang tải...*/}</div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Tên danh mục</th><th>Số sản phẩm</th><th>Thao tác</th></tr></thead>
            <tbody>
              {items.map((c, i) => (
                <tr key={c.categoryId}>
                  <td style={{ fontFamily:'Space Mono,monospace', color:'var(--dim)', fontSize:11 }}>{String(c.categoryId).padStart(2,'0')}</td>
                  <td style={{ fontWeight:500 }}>
                    <span style={{ marginRight:8 }}>{['📱','💻','🎧','⌚','📷','🖥'][i % 6]}</span>
                    {c.categoryName}
                  </td>
                  <td>
                    <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'var(--text2)' }}>
                      {c.productCount ?? '—'} sản phẩm
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => del(c.categoryId)}>🗑 Xóa</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--dim)', padding:24, fontFamily:'Space Mono,monospace' }}>{/* Chưa có danh mục nào */}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal thêm danh mục */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ width:420 }}>
            <div className="modal-head">
              <div className="modal-title">🏷 Thêm danh mục sản phẩm</div>
              <div className="modal-close" onClick={() => setModal(false)}>✕</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tên danh mục *</label>
                <input className="form-input" placeholder="vd: Điện thoại, Laptop, Phụ kiện..."
                  value={form.categoryName}
                  onChange={e => setForm(f => ({ ...f, categoryName: e.target.value }))}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && save()} />
              </div>
              <div style={{ fontSize:12, color:'var(--dim)', marginTop:8 }}>
                Danh mục dùng để phân nhóm sản phẩm và hỗ trợ thống kê doanh thu theo nhóm (UC5).
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : '✓ Thêm danh mục'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
