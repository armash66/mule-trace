import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { authApi } from '../api/client';
import { Lock, User, AlertTriangle } from 'lucide-react';

export default function Login() {
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
      navigate('/app/command-center');
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-0)',
      padding: 20,
    }}>
      <div className="atmosphere" />
      <div style={{
        width: '100%',
        maxWidth: 400,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#070A10',
            marginBottom: 16,
          }}>
            MT
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--text-0)',
            marginBottom: 4,
          }}>
            MuleTrace
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            Fraud Investigation Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(255,77,94,.1)',
              border: '1px solid rgba(255,77,94,.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: 16,
            }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: 'var(--text-1)',
              marginBottom: 6,
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-2)',
              }} />
              <input
                className="input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst"
                style={{ paddingLeft: 34 }}
                autoFocus
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: 'var(--text-1)',
              marginBottom: 6,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-2)',
              }} />
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: 34 }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px 16px', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{
            marginTop: 20,
            padding: 12,
            background: 'var(--bg-2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--text-2)',
          }}>
            <strong style={{ color: 'var(--text-1)' }}>Demo credentials:</strong>
            <div style={{ marginTop: 6, display: 'grid', gap: 3, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
              <span>analyst / analyst123</span>
              <span>lead / lead123</span>
              <span>admin / admin123</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
