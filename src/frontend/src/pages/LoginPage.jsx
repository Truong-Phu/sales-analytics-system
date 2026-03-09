// ============================================================
// FILE: src/pages/LoginPage.jsx  — UC1: Đăng nhập
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Vui lòng nhập đầy đủ thông tin.'); return; }
    setLoading(true); setError('');
    try {
      await login(form.username, form.password);
      navigate('/');
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
            <div className="metric"><div className="metric-dot" /><div><div className="metric-label">Tổng doanh thu</div><div className="metric-value">1.25 tỷ <span>↑ 12.4%</span></div></div></div>
            <div className="metric"><div className="metric-dot orange" /><div><div className="metric-label">Đơn hàng tháng này</div><div className="metric-value">32 đơn <span>↑ 8.1%</span></div></div></div>
            <div className="metric"><div className="metric-dot blue" /><div><div className="metric-label">Kênh bán hàng</div><div className="metric-value">6 kênh <span>active</span></div></div></div>
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
                  onChange={e => setForm(p=>({...p, username:e.target.value}))} autoFocus/>
              </div>
            </div>
            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input type="password" placeholder="••••••••" value={form.password}
                  onChange={e => setForm(p=>({...p, password:e.target.value}))}/>
              </div>
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập →'}
            </button>
          </form>
          <div className="hint">
            <div className="hint-title">// test accounts</div>
            <div className="hint-row"><span>Admin</span><code>admin / Admin@123</code></div>
            <div className="hint-row"><span>Manager</span><code>manager01 / Manager@123</code></div>
            <div className="hint-row"><span>Staff</span><code>staff01 / Staff@123</code></div>
          </div>
          <div className="footer-note">
            <span className="status-dot" />API: localhost:5000
          </div>
        </div>
      </div>
    </div>
  );
}
