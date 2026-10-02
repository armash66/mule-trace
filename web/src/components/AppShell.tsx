import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useStore } from '../store/store';
import { CommandPalette } from './CommandPalette';
import { ShortcutSheet } from './ShortcutSheet';
import { WhyScoreDrawer } from './WhyScoreDrawer';
import { Toast } from './Toast';
import { GlobalDropOverlay } from './data-hub/GlobalDropOverlay';
import {
  LayoutDashboard,
  Bell,
  Search as SearchIcon,
  Snowflake,
  FolderOpen,
  Database,
  BookOpen,
  Sliders,
  BarChart3,
  ClipboardList,
  Play,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import './AppShell.css';

/* ── Navigation config ────────────────────────────────── */

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  badge?: number;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/overview',  label: 'Overview',    icon: LayoutDashboard },
  { to: '/alerts',    label: 'Alerts',      icon: Bell },
  { to: '/workspace', label: 'Investigate', icon: SearchIcon },
  { to: '/freezes',   label: 'Freezes',     icon: Snowflake },
  { to: '/cases/fan_1', label: 'Cases',     icon: FolderOpen },
  { to: '/data',      label: 'Data',        icon: Database },
  { to: '/',          label: 'Pitch Landing', icon: BookOpen, end: true },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/patterns',    label: 'How it works', icon: BookOpen },
  { to: '/replay',      label: 'Replay',       icon: Play },
  { to: '/rules',       label: 'Rules',        icon: Sliders },
  { to: '/performance', label: 'Accuracy',     icon: BarChart3 },
  { to: '/audit',       label: 'Activity log', icon: ClipboardList },
];

/* ── Page title map ───────────────────────────────────── */

const PAGE_TITLES: Record<string, string> = {
  '/':            'Overview',
  '/alerts':      'Alerts',
  '/workspace':   'Investigate',
  '/freezes':     'Freezes',
  '/cases':       'Cases',
  '/data':        'Data',
  '/upload':      'Data',
  '/patterns':    'How it works',
  '/replay':      'Replay',
  '/rules':       'Rules',
  '/performance': 'Accuracy',
  '/audit':       'Activity log',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (prefix !== '/' && pathname.startsWith(prefix)) return title;
  }
  return 'Overview';
}

/* ── Component ────────────────────────────────────────── */

export const AppShell: React.FC = () => {
  const [backendOffline, setBackendOffline] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    showToast,
    runs,
    activeRunId,
    setActiveRunId,
    fetchRuns,
  } = useStore();

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    const offline = () => setBackendOffline(true);
    const online = () => setBackendOffline(false);
    window.addEventListener('muletrace:backend-offline', offline);
    window.addEventListener('muletrace:backend-online', online);
    return () => {
      window.removeEventListener('muletrace:backend-offline', offline);
      window.removeEventListener('muletrace:backend-online', online);
    };
  }, []);

  // Keyboard shortcut: ⌘K / Ctrl+K for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  const activeRun = runs.find((r) => r.id === activeRunId);
  const activeRunName = activeRun?.name ?? 'No dataset';
  const isRunActive = activeRun?.status === 'running';

  return (
    <div className="shell">
      {/* Global Modals & Drawers */}
      <GlobalDropOverlay />
      <CommandPalette />
      <ShortcutSheet />
      <WhyScoreDrawer />
      <Toast />
      {backendOffline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '8px 16px', background: 'var(--signal)', color: 'var(--paper)', textAlign: 'center', fontSize: 13 }}>
          Backend offline: mock data
        </div>
      )}

      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <aside className="shell-sidebar">
        <div>
          {/* Brand */}
          <div className="shell-brand">
            <span className="shell-brand-name">MuleTrace</span>
            <span className="shell-brand-version">v0.1</span>
          </div>

          {/* Primary Navigation */}
          <nav className="shell-nav">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shell-nav-link${isActive ? ' active' : ''}`
                }
              >
                <item.icon className="shell-nav-icon" />
                {item.label}
                {item.badge && item.badge > 0 && (
                  <span className="shell-nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}

            <div className="shell-nav-sep" />
            <div className="shell-nav-label">More</div>

            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shell-nav-link secondary${isActive ? ' active' : ''}`
                }
              >
                <item.icon className="shell-nav-icon" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer — Active run + Theme toggle */}
        <div className="shell-sidebar-footer">
          <div
            className="shell-run-status"
            onClick={() => navigate('/data')}
            title={`Active dataset: ${activeRunName}`}
          >
            <span className={`shell-run-dot ${isRunActive ? '' : 'idle'}`} />
            <span className="shell-run-name">{activeRunName}</span>
            <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
          </div>

          <button
            className="shell-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────── */}
      <div className="shell-content">
        {/* Top Bar */}
        <header className="shell-topbar">
          <h1 className="shell-topbar-title">
            {getPageTitle(location.pathname)}
          </h1>

          <div className="shell-topbar-actions">
            {/* Dataset selector */}
            <div className="shell-dataset">
              <span>Dataset:</span>
              <select
                className="shell-dataset-select"
                value={activeRunId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setActiveRunId(id);
                  showToast(
                    `Switched dataset to ${
                      runs.find((r) => r.id === id)?.name || id
                    }`
                  );
                }}
              >
                {runs.length === 0 && <option value="">Default</option>}
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Add data button */}
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/data?step=select')}
            >
              <Database size={14} />
              Add data
            </button>

            {/* Search trigger */}
            <button
              type="button"
              className="shell-search-trigger"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <SearchIcon size={14} />
              Search…
              <kbd>⌘K</kbd>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="shell-main">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="shell-footer">
          <span>
            Demo data · Nothing here is real · A person confirms every action
          </span>
          <div className="shell-footer-right">
            <span>
              {activeRun
                ? `${(activeRun.txn_count || 0).toLocaleString()} txns · ${(
                    activeRun.acct_count || 0
                  ).toLocaleString()} accts`
                : '—'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
