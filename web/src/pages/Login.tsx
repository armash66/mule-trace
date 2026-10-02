import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { authApi } from '../api/client';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      const data = res.data;
      localStorage.setItem('muletrace_token', data.access_token);
      localStorage.setItem('muletrace_refresh', data.refresh_token);
      setUser({ user_id: '', username: data.username, role: data.role });
      navigate('/');
    } catch (err: any) {
      let msg = err.response?.data?.detail;
      if (!msg) {
        if (err.response?.status === 502 || err.response?.status === 504 || err.message === 'Network Error') {
          msg = 'Backend server is unreachable (port 8000). Please ensure uvicorn is running.';
        } else {
          msg = err.message || 'Invalid credentials';
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--paper)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          border: '2px solid var(--ink)',
          backgroundColor: 'var(--paper)',
          padding: '32px 28px',
        }}
      >
        <div style={{ marginBottom: '28px' }}>
          <h1 className="t-head" style={{ color: 'var(--ink)', marginBottom: '4px' }}>
            MuleTrace
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
            Sign in to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div className="mono" style={{ color: 'var(--signal)', fontSize: '12px' }}>
              Fix: {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="mono" style={{ color: 'var(--ink-2)' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="analyst"
              autoFocus
              required
              className="mono"
              style={{
                padding: '8px 10px',
                border: '1px solid var(--rule)',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label className="mono" style={{ color: 'var(--ink-2)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mono"
              style={{
                padding: '8px 10px',
                border: '1px solid var(--rule)',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div
            className="mono"
            style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--rule)',
              fontSize: '11px',
              color: 'var(--ink-2)',
            }}
          >
            <div>Demo accounts:</div>
            <div style={{ marginTop: '4px' }}>analyst / analyst123</div>
            <div>lead / lead123</div>
            <div>admin / admin123</div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
