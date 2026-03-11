// FILE: src/pages/LogsPage.jsx
// UC8: Ghi log & Theo dõi hoạt động hệ thống — Actor: Admin only
import { useState, useEffect, useCallback } from 'react';
import { logsApi, usersApi } from '../services/api';

export default function LogsPage() {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [userId,  setUserId]  = useState('');
  const [users,   setUsers]   = useState([]);   // dynamic user list
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);
  const PAGE_SIZE = 20;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load user list for filter dropdown
  useEffect(() => {
    usersApi.getAll({ page: 1, pageSize: 100 })
      .then(r => setUsers(r.data?.items || r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = document.getElementById('page-title-slot');
    if (t) t.textContent = 'Nhật ký hệ thống';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await logsApi.getAll({ page, pageSize: PAGE_SIZE, userId: userId || undefined });
      setItems(r.data?.items || r.data || []);
      setTotal(r.data?.totalCount || r.data?.length || 0);
    } catch {
      showToast('Lỗi tải nhật ký', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, userId]);

  useEffect(() => { load(); }, [load]);

  const ACTION_STYLE = {
    LOGIN:          { color: 'var(--green)',  bg: 'rgba(45,206,110,.1)'  },
    LOGOUT:         { color: 'var(--dim)',    bg: 'rgba(107,114,128,.08)' },
    CREATE_ORDER:   { color: 'var(--blue)',   bg: 'rgba(96,180,250,.1)'  },
    UPDATE_ORDER:   { color: 'var(--amber)',  bg: 'rgba(255,192,72,.1)'  },
    DELETE_ORDER:   { color: 'var(--red)',    bg: 'rgba(255,107,107,.1)' },
    VIEW_DASHBOARD: { color: 'var(--purple)', bg: 'rgba(177,151,252,.1)' },
    CREATE_USER:    { color: 'var(--blue)',   bg: 'rgba(96,180,250,.1)'  },
    UPDATE_USER:    { color: 'var(--amber)',  bg: 'rgba(255,192,72,.1)'  },
    DELETE_USER:    { color: 'var(--red)',    bg: 'rgba(255,107,107,.1)' },
    EXPORT_REPORT_EXCEL: { color: 'var(--green3)', bg: 'rgba(95,232,154,.1)' },
    VIEW_REPORT:    { color: 'var(--green3)', bg: 'rgba(95,232,154,.08)' },
    IMPORT_ORDERS:  { color: 'var(--purple)', bg: 'rgba(177,151,252,.1)' },
  };

  const getActionStyle = (action) => {
    const key = Object.keys(ACTION_STYLE).find(k => action?.startsWith(k));
    return ACTION_STYLE[key] || { color: 'var(--text2)', bg: 'rgba(255,255,255,.03)' };
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>
          Tự động ghi nhận mọi thao tác người dùng trong hệ thống
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select
            className="form-input" style={{ width: 180 }}
            value={userId}
            onChange={e => { setUserId(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả người dùng</option>
            {users.map(u => (
              <option key={u.userId} value={u.userId}>
                {u.username} ({u.role})
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={load}>🔄 Làm mới</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Tổng bản ghi',    val: total,     color: 'var(--green)'  },
          { label: 'Trang hiện tại',  val: page,      color: 'var(--blue)'   },
          { label: 'Bản ghi/trang',   val: PAGE_SIZE, color: 'var(--amber)'  },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">📝 Nhật ký hoạt động hệ thống</span>
          <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>
            {total} bản ghi
          </span>
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            Đang tải nhật ký...
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
                    <td className="td-mono">#{l.logId}</td>
                    <td className="td-mono" style={{ whiteSpace: 'nowrap', color: 'var(--text3)' }}>
                      {new Date(l.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text2)' }}>
                        {l.username || `user#${l.userId}`}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12, fontWeight: 600,
                        color: style.color, background: style.bg,
                        padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap',
                      }}>
                        {l.action}
                      </span>
                    </td>
                    <td className="td-mono" style={{ color: 'var(--text3)' }}>
                      {l.ipAddress || '—'}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-title">Chưa có nhật ký nào</div>
                      <div className="empty-state-sub">Các thao tác sẽ được ghi lại tại đây</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className="pagination">
          <span className="pagination-info">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,total)} / {total} bản ghi</span>
          <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return <button key={p} className={`page-btn${page===p?' active':''}`} onClick={() => setPage(p)}>{p}</button>;
          })}
          {totalPages > 7 && <span style={{ color: 'var(--text3)', fontSize: 12 }}>…</span>}
          <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>›</button>
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
