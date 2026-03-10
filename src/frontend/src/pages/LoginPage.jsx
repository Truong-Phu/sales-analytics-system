// ============================================================
// FILE: src/pages/LoginPage.jsx — Đăng nhập hệ thống
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Vui lòng nhập đầy đủ thông tin.'); return; }
    setLoading(true); setError('');
    try {
      const userInfo = await login(form.username, form.password);
      navigate(userInfo.role === 'Staff' ? '/home' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Sai tài khoản hoặc mật khẩu.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="bg-grid" />
      <div className="blob blob1" /><div className="blob blob2" /><div className="blob blob3" />
      <div className="scanlines" />

      <div className="login-wrap">
        {/* Left panel */}
        <div className="left-panel">
          <div className="brand">
            <div className="brand-icon">📊</div>
            <div className="brand-name">SalesAnalytics</div>
            <div className="brand-sub">Multi-channel · Data Platform</div>
          </div>
          <div className="tagline">
            Tổng hợp dữ liệu<br/>
            <strong>đa kênh bán hàng</strong><br/>
            trong một nơi.
          </div>
          <div className="metrics">
            <div className="metric">
              <div className="metric-dot" />
              <div><div className="metric-label">Doanh thu tháng này</div><div className="metric-value">412M <span>↑ 12.4%</span></div></div>
            </div>
            <div className="metric">
              <div className="metric-dot orange" />
              <div><div className="metric-label">Đơn hàng Q1/2025</div><div className="metric-value">32 đơn <span>↑ 8.1%</span></div></div>
            </div>
            <div className="metric">
              <div className="metric-dot blue" />
              <div><div className="metric-label">Kênh bán hàng</div><div className="metric-value">6 kênh <span>active</span></div></div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="right-panel">
          <div className="form-title">// access</div>
          <div className="form-heading">Đăng nhập hệ thống</div>

          {error && <div className="login-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tên đăng nhập</label>
              <div className="input-wrap">
                <span className="input-icon">👤</span>
                <input type="text" placeholder="username" value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoFocus />
              </div>
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--dim)', padding:0 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập →'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--dim)' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color:'var(--green)', textDecoration:'none', fontWeight:600 }}>Đăng ký ngay</Link>
          </div>

          <div className="footer-note">
            <span className="status-dot" />API: localhost:5000
          </div>
        </div>
      </div>
    </div>
  );
}
