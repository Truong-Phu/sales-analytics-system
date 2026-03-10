// ============================================================
// FILE: src/pages/ProfilePage.jsx
// UC1 mở rộng: Xem thông tin cá nhân + Đổi mật khẩu
// Dành cho: ALL roles (Admin, Manager, Staff)
// ============================================================
import { useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [meData, setMeData] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Hồ sơ cá nhân'; }
    // Lấy thông tin từ JWT đã lưu
    setMeData(user);
  }, [user]);

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { showToast('Vui lòng điền đầy đủ', 'error'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { showToast('Mật khẩu mới không khớp', 'error'); return; }
    if (pwForm.newPassword.length < 8) { showToast('Mật khẩu mới cần ít nhất 8 ký tự', 'error'); return; }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      showToast('✓ Đổi mật khẩu thành công');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      showToast(e.response?.data?.message || 'Mật khẩu hiện tại không đúng', 'error');
    } finally { setSaving(false); }
  };

  const roleColor = { Admin: 'var(--red)', Manager: 'var(--amber)', Staff: 'var(--blue)' };
  const roleIcon  = { Admin: '🛡', Manager: '📊', Staff: '🧑‍💼' };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Profile header */}
      <div className="card card-body" style={{ marginBottom: 16, display:'flex', alignItems:'center', gap:20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--green2), var(--green3))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0,
          boxShadow: '0 0 24px rgba(34,197,94,.3)',
        }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{user?.fullName}</div>
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:12, color:'var(--dim)', marginBottom:8 }}>@{user?.username}</div>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12,
            fontFamily: 'Space Mono,monospace',
            background: `rgba(${user?.role==='Admin'?'248,113,113':user?.role==='Manager'?'251,191,36':'96,165,250'},.12)`,
            color: roleColor[user?.role] || 'var(--dim)',
          }}>
            {roleIcon[user?.role]} {user?.role}
          </span>
        </div>
        <div style={{ textAlign:'right', fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>
          <div>User ID: #{user?.userId}</div>
          <div style={{ marginTop:4, color:'var(--green)', fontSize:10 }}>● Đang hoạt động</div>
        </div>
      </div>

      {/* Info card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">👤 Thông tin tài khoản</span>
        </div>
        <div style={{ padding: '8px 18px 18px' }}>
          {[
            { label: 'Họ và tên',     val: user?.fullName },
            { label: 'Username',      val: user?.username },
            { label: 'Vai trò',       val: user?.role },
            { label: 'User ID',       val: `#${user?.userId}` },
          ].map((r,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom: i<3 ? '1px solid rgba(26,42,26,.4)' : 'none', fontSize:13 }}>
              <span style={{ color:'var(--dim)', fontFamily:'Space Mono,monospace', fontSize:11, textTransform:'uppercase', letterSpacing:'.8px' }}>{r.label}</span>
              <span style={{ fontWeight:500 }}>{r.val || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🔒 Đổi mật khẩu</span>
          <span style={{ fontSize:10, color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>// UC1</span>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14, maxWidth:400 }}>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Mật khẩu hiện tại</label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={pwForm.currentPassword}
                onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Mật khẩu mới</label>
              <input type="password" className="form-input" placeholder="Ít nhất 8 ký tự"
                value={pwForm.newPassword}
                onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Xác nhận mật khẩu mới</label>
              <input type="password" className="form-input" placeholder="Nhập lại mật khẩu mới"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} />
            </div>

            {/* Strength hint */}
            {pwForm.newPassword && (
              <div style={{ padding:'10px 14px', background:'rgba(34,197,94,.04)', border:'1px solid rgba(34,197,94,.1)', borderRadius:8, fontSize:12 }}>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'var(--dim)', marginBottom:6 }}>// ĐỘ MẠNH MẬT KHẨU</div>
                {[
                  { check: pwForm.newPassword.length >= 8,          label: 'Ít nhất 8 ký tự' },
                  { check: /[A-Z]/.test(pwForm.newPassword),         label: 'Có chữ hoa' },
                  { check: /[0-9]/.test(pwForm.newPassword),         label: 'Có chữ số' },
                  { check: /[^A-Za-z0-9]/.test(pwForm.newPassword),  label: 'Có ký tự đặc biệt' },
                ].map((r,i) => (
                  <div key={i} style={{ color: r.check ? 'var(--green)' : 'var(--dim)', marginBottom:2 }}>
                    {r.check ? '✓' : '○'} {r.label}
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-primary" style={{ width:'fit-content' }} onClick={changePassword} disabled={saving}>
              {saving ? 'Đang lưu...' : '✓ Đổi mật khẩu'}
            </button>
          </div>
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
