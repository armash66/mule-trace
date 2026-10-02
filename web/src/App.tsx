import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/store';
import AppShell from './components/AppShell';
import Login from './pages/Login';

// Lazy-loaded pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Upload = lazy(() => import('./pages/Upload'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const Cases = lazy(() => import('./pages/Cases'));
const Rings = lazy(() => import('./pages/Rings'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Settings = lazy(() => import('./pages/Settings'));
const Audit = lazy(() => import('./pages/Audit'));
const Metrics = lazy(() => import('./pages/Metrics'));

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg-0)',
      color: 'var(--text-1)',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 200, height: 24, margin: '0 auto 12px' }} />
        <div className="skeleton" style={{ width: 140, height: 16, margin: '0 auto' }} />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useStore.getState().setCommandPaletteOpen(true);
      }
      // ? : show shortcuts (not in inputs)
      if (e.key === '?' && !(e.target as HTMLElement).closest('input, textarea')) {
        // TODO: show shortcut cheat sheet
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="atmosphere" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={
          <ProtectedRoute><AppShell /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="command-center" replace />} />
          <Route path="upload" element={<Upload />} />
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="cases" element={<Cases />} />
          <Route path="rings" element={<Rings />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="settings" element={<Settings />} />
          <Route path="audit" element={<Audit />} />
          <Route path="metrics" element={<Metrics />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
