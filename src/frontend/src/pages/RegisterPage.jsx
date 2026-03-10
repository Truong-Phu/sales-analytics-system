// ============================================================
// FILE: src/pages/RegisterPage.jsx
// Tự đăng ký tài khoản Staff mới
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css'; // dùng chung CSS nền

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', fullName: '', email: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: '' }));
    setServerError('');
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim())     e.fullName = 'Họ tên là bắt buộc.';
    if (!form.username.trim())     e.username = 'Tên đăng nhập là bắt buộc.';
    else if (form.username.length < 4) e.username = 'Ít nhất 4 ký tự.';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = 'Chỉ dùng chữ, số và dấu gạch dưới.';
    if (!form.password)            e.password = 'Mật khẩu là bắt buộc.';
    else if (form.password.length < 8) e.password = 'Ít nhất 8 ký tự.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Mật khẩu không khớp.';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ username: form.username, password: form.password, fullName: form.fullName, email: form.email || undefined });
      setSuccess('Đăng ký thành công! Tài khoản đang chờ Admin phê duyệt...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally { setLoading(false); }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)    s++;
    if (/[A-Z]/.test(p))  s++;
    if (/[0-9]/.test(p))  s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#16a34a'][strength];

  return (
    <div className="login-page">
      <div className="bg-grid" />
      <div className="blob blob1" /><div className="blob blob2" /><div className="blob blob3" />
      <div className="scanlines" />

      <div className="login-wrap" style={{ maxWidth: 820 }}>
        {/* Left */}
        <div className="left-panel">
          <div className="brand">
            <div className="brand-icon">📊</div>
            <div className="brand-name">SalesAnalytics</div>
            <div className="brand-sub">Multi-channel · Data Platform</div>
          </div>
          <div className="tagline">
            Tham gia đội ngũ<br/>
            <strong>quản lý bán hàng</strong><br/>
            thông minh hơn.
          </div>
          <div className="metrics">
            <div className="metric">
              <div className="metric-dot" />
              <div><div className="metric-label">Vai trò sau đăng ký</div><div className="metric-value">Staff <span>Nhân viên</span></div></div>
            </div>
            <div className="metric">
              <div className="metric-dot orange" />
              <div><div className="metric-label">Quyền truy cập</div><div className="metric-value">Đơn hàng · Sản phẩm · KH</div></div>
            </div>
            <div className="metric">
              <div className="metric-dot blue" />
              <div><div className="metric-label">Nâng cấp quyền</div><div className="metric-value">Liên hệ Admin</div></div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="right-panel">
          <div className="form-title">// new account</div>
          <div className="form-heading">Đăng ký tài khoản</div>

          {serverError && <div className="login-error">⚠ {serverError}</div>}
          {success     && <div style={{ padding:'12px 16px', background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', borderRadius:8, color:'#4ade80', fontSize:13, marginBottom:16 }}>✓ {success}</div>}

          {/* Full name */}
          <div className="form-group">
            <label>Họ và tên *</label>
            <div className="input-wrap">
              <span className="input-icon">✏️</span>
              <input type="text" placeholder="Nguyễn Văn A" value={form.fullName}
                onChange={e => set('fullName', e.target.value)} autoFocus />
            </div>
            {errors.fullName && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{errors.fullName}</div>}
          </div>

          {/* Username */}
          <div className="form-group">
            <label>Tên đăng nhập *</label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input type="text" placeholder="vd: nguyen_van_a" value={form.username}
                onChange={e => set('username', e.target.value.toLowerCase())} />
            </div>
            {errors.username && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{errors.username}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email <span style={{ color:'var(--dim)', fontSize:11 }}>(tuỳ chọn)</span></label>
            <div className="input-wrap">
              <span className="input-icon">📧</span>
              <input type="email" placeholder="email@example.com" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
            {errors.email && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{errors.email}</div>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Mật khẩu *</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input type="password" placeholder="Ít nhất 8 ký tự" value={form.password}
                onChange={e => set('password', e.target.value)} />
            </div>
            {form.password && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                <div style={{ flex:1, height:4, borderRadius:2, background:'rgba(255,255,255,.1)' }}>
                  <div style={{ width:`${strength*25}%`, height:'100%', borderRadius:2, background:strengthColor, transition:'all .3s' }} />
                </div>
                <span style={{ fontSize:11, color:strengthColor, minWidth:70, fontFamily:'Space Mono,monospace' }}>{strengthLabel}</span>
              </div>
            )}
            {errors.password && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{errors.password}</div>}
          </div>

          {/* Confirm */}
          <div className="form-group">
            <label>Xác nhận mật khẩu *</label>
            <div className="input-wrap">
              <span className="input-icon">🔐</span>
              <input type="password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            {errors.confirmPassword && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{errors.confirmPassword}</div>}
          </div>

          <button className="btn-login" onClick={handleSubmit} disabled={loading || !!success}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký →'}
          </button>

          <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--dim)' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color:'var(--green)', textDecoration:'none', fontWeight:600 }}>Đăng nhập</Link>
          </div>

          <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(251,191,36,.06)', border:'1px solid rgba(251,191,36,.15)', borderRadius:8, fontSize:12, color:'#fde68a' }}>
            ⏳ Tài khoản sau khi đăng ký sẽ ở trạng thái <strong>chờ duyệt</strong>. Admin sẽ phê duyệt trước khi bạn có thể đăng nhập. Vai trò mặc định: <strong>Staff</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
