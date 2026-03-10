// ============================================================
// FILE: src/pages/PendingUsersPage.jsx
// Admin duyệt / từ chối tài khoản đăng ký mới
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../services/api';

const fmt = dt => dt ? new Date(dt).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

export default function PendingUsersPage() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null); // userId being processed
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null); // { userId, username, action:'approve'|'reject' }

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await usersApi.getPending();
      setList(r.data || []);
    } catch { showToast('Không tải được danh sách chờ duyệt', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Duyệt tài khoản'; }
    load();
  }, [load]);

  const handleAction = async () => {
    if (!confirm) return;
    const { userId, action } = confirm;
    setActing(userId);
    setConfirm(null);
    try {
      if (action === 'approve') {
        await usersApi.approve(userId);
        showToast('✓ Đã phê duyệt tài khoản thành công');
      } else {
        await usersApi.reject(userId);
        showToast('Đã từ chối và xóa tài khoản');
      }
      await load();
    } catch (e) {
      showToast(e.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally { setActing(null); }
  };

  return (
    <div>
      {/* Header */}
      <div className="card card-body" style={{ marginBottom: 16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Danh sách tài khoản chờ phê duyệt</div>
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>
            Tài khoản tự đăng ký qua trang /register sẽ xuất hiện ở đây. Admin phê duyệt trước khi người dùng có thể đăng nhập.
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ padding:'6px 14px', borderRadius:20, background:'rgba(251,191,36,.12)', color:'var(--amber)', fontSize:12, fontWeight:600, fontFamily:'Space Mono,monospace' }}>
            {list.length} chờ duyệt
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            {loading ? '⟳' : '🔄 Làm mới'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card table-wrap">
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--dim)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>⏳</div>
            Đang tải...
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>Không có tài khoản nào chờ duyệt</div>
            <div style={{ fontSize:13, color:'var(--dim)' }}>Tất cả đăng ký đã được xử lý.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width:40 }}>#</th>
                <th>Tên đăng nhập</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Thời gian đăng ký</th>
                <th style={{ textAlign:'center', width:200 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u, i) => (
                <tr key={u.userId}>
                  <td style={{ color:'var(--dim)', fontFamily:'Space Mono,monospace', fontSize:11 }}>{String(i+1).padStart(2,'0')}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(251,191,36,.15)', color:'var(--amber)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
                        {u.username?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight:500 }}>@{u.username}</span>
                    </div>
                  </td>
                  <td>{u.fullName || <span style={{ color:'var(--dim)' }}>—</span>}</td>
                  <td style={{ color:'var(--dim)', fontSize:12 }}>{u.email || '—'}</td>
                  <td>
                    <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, background:'rgba(96,165,250,.12)', color:'var(--blue)', fontFamily:'Space Mono,monospace' }}>
                      {u.roleName || 'Staff'}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>{fmt(u.createdAt)}</td>
                  <td>
                    <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                      <button
                        className="btn"
                        style={{ background:'rgba(34,197,94,.12)', color:'var(--green)', border:'1px solid rgba(34,197,94,.25)', fontSize:12, padding:'5px 14px', borderRadius:6 }}
                        disabled={acting === u.userId}
                        onClick={() => setConfirm({ userId: u.userId, username: u.username, action:'approve' })}>
                        {acting === u.userId ? '⟳' : '✓ Duyệt'}
                      </button>
                      <button
                        className="btn"
                        style={{ background:'rgba(248,113,113,.1)', color:'var(--red)', border:'1px solid rgba(248,113,113,.2)', fontSize:12, padding:'5px 14px', borderRadius:6 }}
                        disabled={acting === u.userId}
                        onClick={() => setConfirm({ userId: u.userId, username: u.username, action:'reject' })}>
                        ✕ Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div style={{ marginTop:16, padding:'14px 18px', background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.15)', borderRadius:10, fontSize:12, color:'#93c5fd', display:'flex', gap:10 }}>
        <span style={{ fontSize:16 }}>ℹ</span>
        <div>
          <strong>Quy trình duyệt:</strong> Người dùng tự đăng ký tại <code style={{ background:'rgba(255,255,255,.08)', padding:'1px 6px', borderRadius:4 }}>/register</code> → Tài khoản được tạo với trạng thái <em>chờ duyệt</em> → Admin phê duyệt tại trang này → Người dùng có thể đăng nhập.
          Tài khoản bị từ chối sẽ bị xóa khỏi hệ thống.
        </div>
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                {confirm.action === 'approve' ? '✓ Xác nhận phê duyệt' : '✕ Xác nhận từ chối'}
              </div>
            </div>
            <div className="modal-body">
              <div style={{ textAlign:'center', padding:'12px 0' }}>
                <div style={{ fontSize:42, marginBottom:12 }}>
                  {confirm.action === 'approve' ? '✅' : '🚫'}
                </div>
                {confirm.action === 'approve' ? (
                  <>
                    <div style={{ fontSize:14, marginBottom:6 }}>
                      Phê duyệt tài khoản <strong style={{ color:'var(--green)' }}>@{confirm.username}</strong>?
                    </div>
                    <div style={{ fontSize:12, color:'var(--dim)' }}>
                      Người dùng sẽ có thể đăng nhập với quyền <strong>Staff</strong> ngay lập tức.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:14, marginBottom:6 }}>
                      Từ chối và xóa tài khoản <strong style={{ color:'var(--red)' }}>@{confirm.username}</strong>?
                    </div>
                    <div style={{ fontSize:12, color:'var(--dim)' }}>
                      ⚠ Hành động này <strong>không thể hoàn tác</strong>. Tài khoản sẽ bị xóa vĩnh viễn.
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Hủy</button>
              <button
                className="btn"
                style={confirm.action === 'approve'
                  ? { background:'rgba(34,197,94,.15)', color:'var(--green)', border:'1px solid rgba(34,197,94,.3)' }
                  : { background:'rgba(248,113,113,.15)', color:'var(--red)', border:'1px solid rgba(248,113,113,.3)' }}
                onClick={handleAction}>
                {confirm.action === 'approve' ? '✓ Xác nhận duyệt' : '✕ Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
