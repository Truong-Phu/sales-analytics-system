// ============================================================
// FILE: src/pages/LogsPage.jsx — UC8: Ghi log & Theo dõi hệ thống
// Actor: Admin only
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { logsApi } from '../services/api';

export default function LogsPage() {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [userId,  setUserId]  = useState('');
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);
  const PAGE_SIZE = 20;

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await logsApi.getAll({ page, pageSize: PAGE_SIZE, userId: userId || undefined });
      setItems(r.data?.items || r.data || []);
      setTotal(r.data?.totalCount || r.data?.length || 0);
    } catch { showToast('Lỗi tải nhật ký', 'error'); }
    finally { setLoading(false); }
  }, [page, userId]);

  useEffect(() => { { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Nhật ký hệ thống'; } }, []);
  useEffect(() => { load(); }, [load]);

  // Colour-code action types
  const ACTION_STYLE = {
    LOGIN:          { color:'var(--green)',  bg:'rgba(34,197,94,.08)'  },
    LOGOUT:         { color:'var(--dim)',    bg:'rgba(107,114,128,.08)'},
    CREATE_ORDER:   { color:'var(--blue)',   bg:'rgba(96,165,250,.08)' },
    UPDATE_ORDER:   { color:'var(--amber)',  bg:'rgba(251,191,36,.08)' },
    DELETE_ORDER:   { color:'var(--red)',    bg:'rgba(248,113,113,.08)'},
    VIEW_DASHBOARD: { color:'var(--purple)', bg:'rgba(167,139,250,.08)'},
    CREATE_USER:    { color:'var(--blue)',   bg:'rgba(96,165,250,.08)' },
    UPDATE_USER:    { color:'var(--amber)',  bg:'rgba(251,191,36,.08)' },
    DELETE_USER:    { color:'var(--red)',    bg:'rgba(248,113,113,.08)'},
  };

  const getActionStyle = (action) => {
    const key = Object.keys(ACTION_STYLE).find(k => action?.startsWith(k));
    return ACTION_STYLE[key] || { color:'var(--text)', bg:'rgba(255,255,255,.03)' };
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>
          Tự động ghi nhận mọi thao tác người dùng trong hệ thống
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <select className="form-input" style={{ width:160 }} value={userId}
            onChange={e => { setUserId(e.target.value); setPage(1); }}>
            <option value="">Tất cả người dùng</option>
            <option value="1">admin</option>
            <option value="2">manager01</option>
            <option value="3">staff01</option>
            <option value="4">staff02</option>
          </select>
          <button className="btn btn-ghost" onClick={load}>🔄 Làm mới</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        {[
          { label:'Tổng bản ghi', val:total,   color:'var(--green)' },
          { label:'Trang hiện tại', val:page,  color:'var(--blue)'  },
          { label:'Bản ghi/trang',  val:PAGE_SIZE, color:'var(--amber)' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:s.color, boxShadow:`0 0 6px ${s.color}` }}/>
            <div>
              <div style={{ fontSize:10, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>{s.label}</div>
              <div style={{ fontSize:16, fontWeight:700, color:s.color }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">📝 Nhật ký hoạt động hệ thống — UC8</span>
          <span style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>
            {total} bản ghi
          </span>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>
            // Đang tải nhật ký...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Thời gian</th>
                <th>Người dùng</th>
                <th>Hành động</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map(l => {
                const style = getActionStyle(l.action);
                return (
                  <tr key={l.logId}>
                    <td style={{ fontFamily:'Space Mono,monospace', color:'var(--dim2)', fontSize:11 }}>
                      #{l.logId}
                    </td>
                    <td style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--dim)', whiteSpace:'nowrap' }}>
                      {new Date(l.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <span style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'var(--text2)' }}>
                        {l.username || `user#${l.userId}`}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontFamily:'Space Mono,monospace', fontSize:11,
                        color: style.color, background: style.bg,
                        padding:'3px 10px', borderRadius:4, whiteSpace:'nowrap',
                      }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--dim2)' }}>
                      {l.ipAddress || '—'}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign:'center', color:'var(--dim)', padding:32, fontFamily:'Space Mono,monospace' }}>
                    // Chưa có nhật ký nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
          {Array.from({ length:Math.min(totalPages, 7) }, (_,i) => {
            const p = i+1;
            return <button key={p} className={`page-btn${page===p?' active':''}`} onClick={()=>setPage(p)}>{p}</button>;
          })}
          {totalPages > 7 && <span style={{color:'var(--dim)',fontSize:12}}>...</span>}
          <button className="page-btn" onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>
            {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,total)} / {total} bản ghi
          </span>
        </div>
      </div>

      {/* Note about export */}
      <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(34,197,94,.03)', border:'1px solid rgba(34,197,94,.08)', borderRadius:8, fontSize:12, color:'var(--dim)' }}>
        <span style={{ color:'var(--green)', fontFamily:'Space Mono,monospace', marginRight:8 }}>//</span>
        Xuất nhật ký Excel: Tính năng sẽ được bổ sung vào backend trong giai đoạn hoàn thiện. Hiện tại dùng Swagger để export trực tiếp.
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
