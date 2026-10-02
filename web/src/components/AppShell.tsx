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
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { SimulateHeistModal } from './SimulateHeistModal';
import { SimulateSummaryModal } from './SimulateSummaryModal';
import { SimulationAlertToasts } from './SimulationAlertToasts';
import { simulationEngine } from '../lib/simulateEngine';
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
  { to: '/overview',  label: 'Overview',      icon: LayoutDashboard },
  { to: '/alerts',    label: 'Alerts',        icon: Bell },
  { to: '/workspace', label: 'Investigate',   icon: SearchIcon },
  { to: '/freezes',   label: 'Freezes',       icon: Snowflake },
  { to: '/cases',     label: 'Cases',         icon: FolderOpen },
  { to: '/data',      label: 'Data',          icon: Database },
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
  '/overview':    'Overview',
  '/command':     'Overview',
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
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    // Simulation state
    simulateModalOpen,
    setSimulateModalOpen,
    summaryModalOpen,
    setSummaryModalOpen,
    isSimulating,
    setIsSimulating,
    simulationPayload,
    setSimulationPayload,
    simulationAlerts,
    addSimulationAlert,
    dismissSimulationAlert,
    clearSimulationAlerts,
    simulationSummary,
    setSimulationSummary,
    setSimulationSpeed,
    setSimulationPaused,
    setActiveScenarioId,
  } = useStore();

  const handleStartSimulation = (scenarioId: string, speed: number) => {
    setIsSimulating(true);
    setActiveScenarioId(scenarioId);
    setSimulationSpeed(speed);
    setSimulationPaused(false);
    clearSimulationAlerts();

    if (location.pathname !== '/overview' && location.pathname !== '/') {
      navigate('/overview');
    }

    simulationEngine.start(scenarioId, speed, {
      onTransaction: (payload) => {
        setSimulationPayload(payload);
      },
      onAlert: (alert) => {
        addSimulationAlert(alert);
      },
      onComplete: (summary) => {
        setIsSimulating(false);
        setSimulationSummary(summary);
        setSummaryModalOpen(true);
      },
      onError: (err) => {
        console.error('Simulation stream error:', err);
      },
    });
  };

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Close mobile drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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
  const activeRunName = activeRun?.name ?? 'Demo Seed 42';
  const isRunActive = activeRun?.status === 'running';

  return (
    <div className="shell">
      {/* Global Modals & Drawers */}
      <GlobalDropOverlay />
      <CommandPalette />
      <ShortcutSheet />
      <WhyScoreDrawer />
      <Toast />

      {/* Live Heist Simulation Modals & Toasts */}
      <SimulateHeistModal
        isOpen={simulateModalOpen}
        onClose={() => setSimulateModalOpen(false)}
        onStartSimulation={handleStartSimulation}
      />
      <SimulateSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => {
          setSummaryModalOpen(false);
          setSimulationSummary(null);
        }}
        onRestart={() => {
          setSummaryModalOpen(false);
          setSimulateModalOpen(true);
        }}
        summary={simulationSummary}
        scenarioTitle={simulationEngine.getActiveScenario()?.title}
      />
      <SimulationAlertToasts
        alerts={simulationAlerts}
        onDismiss={dismissSimulationAlert}
      />

      {/* Backend offline warning banner from main */}
      {backendOffline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '8px 16px', background: 'var(--signal)', color: '#07080A', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
          Backend offline: mock data
        </div>
      )}

      {/* Mobile Backdrop */}
      <div
        className={`shell-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <aside className={`shell-sidebar ${drawerOpen ? 'drawer-open' : ''}`} aria-label="Sidebar navigation">
        <div>
          {/* Brand */}
          <div className="shell-brand-wrap">
            <div className="shell-brand" onClick={() => navigate('/overview')} role="button" tabIndex={0}>
              <span className="shell-brand-name">
                MULETRACE<span className="brand-dot">·</span>
              </span>
              <span className="shell-brand-version">v0.1</span>
            </div>
            <button
              type="button"
              className="shell-drawer-close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="shell-nav" aria-label="Primary">
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
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="shell-nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}

            <div className="shell-nav-sep" />
            <div className="shell-nav-label">MORE</div>

            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shell-nav-link secondary${isActive ? ' active' : ''}`
                }
              >
                <item.icon className="shell-nav-icon" />
                <span>{item.label}</span>
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
            role="button"
            tabIndex={0}
          >
            <span className={`shell-run-dot ${isRunActive ? '' : 'idle'}`} />
            <span className="shell-run-name">{activeRunName}</span>
            <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
          </div>

          <button
            type="button"
            className="shell-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────── */}
      <div className="shell-content">
        {/* Top Bar */}
        <header className="shell-topbar">
          <div className="shell-topbar-left">
            <button
              type="button"
              className="shell-mobile-toggle"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation drawer"
            >
              <Menu size={18} />
            </button>
            <h1 className="shell-topbar-title">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="shell-topbar-actions">
            {/* Dataset selector */}
            <div className="shell-dataset">
              <span>Dataset:</span>
              <select
                aria-label="Select active dataset"
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
                {runs.length === 0 && <option value="">Default (Seed 42)</option>}
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Simulation Active Indicator in Topbar */}
            {isSimulating && (
              <div className="topbar-sim-badge">
                <span className="sim-dot" />
                <span>SIMULATION</span>
              </div>
            )}

            {/* Simulate Live Heist button */}
            <button
              type="button"
              className="btn-ghost-sim"
              onClick={() => {
                if (isSimulating) {
                  navigate('/overview');
                } else {
                  setSimulateModalOpen(true);
                }
              }}
              title="Simulate Live Heist"
              aria-label="Simulate Live Heist"
            >
              <span>Simulate Live Heist</span>
            </button>

            {/* Add data button (Primary amber button) */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/data?step=select')}
            >
              <Plus size={14} />
              Add data
            </button>

            {/* Search trigger */}
            <button
              type="button"
              className="shell-search-trigger"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <SearchIcon size={14} />
              <span>Search…</span>
              <kbd>⌘K</kbd>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="shell-main">
          <Outlet />
        </main>

        {/* Footer Strip */}
        <footer className="shell-footer">
          <div className="shell-footer-left">
            {isSimulating ? (
              <span className="shell-footer-prov simulation">
                <span className="prov-dot" style={{ backgroundColor: 'var(--signal)' }} />
                SIMULATION
              </span>
            ) : (
              <span className="shell-footer-prov">
                <span className="prov-dot" />
                SAMPLE
              </span>
            )}
            <span>
              {isSimulating
                ? `Live heist simulation active · ${simulationPayload?.freeze_point?.label || 'Monitoring money movement in real-time'}`
                : 'Demo data · Nothing here is real · A person confirms every action'}
            </span>
          </div>
          <div className="shell-footer-right">
            <span>
              {isSimulating && simulationPayload
                ? `Step ${simulationPayload.step}/${simulationPayload.total_steps} · ₹${(simulationPayload.stolen_moving / 100000).toFixed(1)}L moving`
                : activeRun
                ? `${(activeRun.txn_count || 62218).toLocaleString()} txns · ${(
                    activeRun.acct_count || 5044
                  ).toLocaleString()} accts`
                : '62,218 txns · 5,044 accts'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
