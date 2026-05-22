import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../api';
import './Login.css';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const { login }                   = useAuth();
  const navigate                    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await auth.login(identifier, password);
      login({
        id: res.employeeId, name: res.name, email: res.email,
        role: res.role, department: res.department,
        designation: res.designation, employeeCode: res.employeeCode,
      }, res.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-glow" />
        <div className="login-plane">✈</div>
      </div>

      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">✈</div>
          <div>
            <div className="login-brand">ARMZ AVIATION</div>
            <div className="login-tagline">Workforce Management Portal</div>
          </div>
        </div>

        <h2 className="login-title">Sign in to your account</h2>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              type="text" className="input"
              placeholder="dev or dev@armzaviation.com"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pwd-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                className="input"
                placeholder="Enter password"
                value={password} onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

      </div>
    </div>
  );
}
