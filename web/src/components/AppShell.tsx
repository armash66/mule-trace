import React, { useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useStore } from '../store/store';
import { CommandPalette } from './CommandPalette';
import { ShortcutSheet } from './ShortcutSheet';
import { WhyScoreDrawer } from './WhyScoreDrawer';
import { Toast } from './Toast';
import { GlobalDropOverlay } from './data-hub/GlobalDropOverlay';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
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

  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'Overview';
    if (pathname.startsWith('/alerts')) return 'Alerts';
    if (pathname.startsWith('/workspace')) return 'Investigate';
    if (pathname.startsWith('/freezes')) return 'Freezes';
    if (pathname.startsWith('/cases')) return 'Cases';
    if (pathname.startsWith('/data') || pathname.startsWith('/upload')) return 'Data';
    if (pathname.startsWith('/patterns')) return 'How it works';
    if (pathname.startsWith('/rules')) return 'Rules';
    if (pathname.startsWith('/performance')) return 'Accuracy';
    if (pathname.startsWith('/audit')) return 'Activity log';
    if (pathname.startsWith('/replay')) return 'Replay';
    return 'Overview';
  };

  const getPrimaryNavStyle = (isActive: boolean) => ({
    display: 'block',
    padding: '8px 16px',
    fontSize: '15px',
    color: isActive ? 'var(--paper)' : 'var(--ink)',
    backgroundColor: isActive ? 'var(--ink)' : 'transparent',
    textDecoration: 'none',
    transition: 'background 100ms ease',
  });

  const getSecondaryNavStyle = (isActive: boolean) => ({
    display: 'block',
    padding: '4px 16px',
    fontSize: '13px',
    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 400,
  });

  const activeRun = runs.find((r) => r.id === activeRunId);
  const activeRunName = activeRun ? activeRun.name : 'Default';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--paper)' }}>
      {/* Global Modals & Drawers */}
      <GlobalDropOverlay />
      <CommandPalette />
      <ShortcutSheet />
      <WhyScoreDrawer />
      <Toast />

      {/* LEFT NAV (width 200px, background paper, right border 1px rule) */}
      <aside
        style={{
          width: '200px',
          minWidth: '200px',
          backgroundColor: 'var(--paper)',
          borderRight: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Wordmark "MuleTrace" at the top in .t-head (no logo tile, no version badge) */}
          <div style={{ padding: '20px 16px 16px 16px' }}>
            <span className="t-head" style={{ color: 'var(--ink)', display: 'block' }}>
              MuleTrace
            </span>
          </div>

          {/* Six text links, 15px, no group labels, no icons: Overview, Alerts, Investigate, Freezes, Cases, Data */}
          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            <NavLink to="/" style={({ isActive }) => getPrimaryNavStyle(isActive)} end>
              Overview
            </NavLink>
            <NavLink to="/alerts" style={({ isActive }) => getPrimaryNavStyle(isActive)}>
              Alerts
            </NavLink>
            <NavLink to="/workspace" style={({ isActive }) => getPrimaryNavStyle(isActive)}>
              Investigate
            </NavLink>
            <NavLink to="/freezes" style={({ isActive }) => getPrimaryNavStyle(isActive)}>
              Freezes
            </NavLink>
            <NavLink to="/cases/fan_1" style={({ isActive }) => getPrimaryNavStyle(isActive)}>
              Cases
            </NavLink>
            <NavLink to="/data" style={({ isActive }) => getPrimaryNavStyle(isActive)}>
              Data
            </NavLink>

            {/* Below a 1px rule, a small label "More" in .mono and four links in 13px ink-2 */}
            <div style={{ margin: '16px 0 8px 0', borderTop: '1px solid var(--rule)' }} />

            <div className="mono" style={{ padding: '4px 16px', color: 'var(--ink-2)', fontSize: '11px' }}>
              More
            </div>

            <NavLink to="/patterns" style={({ isActive }) => getSecondaryNavStyle(isActive)}>
              How it works
            </NavLink>
            <NavLink to="/rules" style={({ isActive }) => getSecondaryNavStyle(isActive)}>
              Rules
            </NavLink>
            <NavLink to="/performance" style={({ isActive }) => getSecondaryNavStyle(isActive)}>
              Accuracy
            </NavLink>
            <NavLink to="/audit" style={({ isActive }) => getSecondaryNavStyle(isActive)}>
              Activity log
            </NavLink>
          </nav>
        </div>
      </aside>

      {/* Main Content Area with TOP BAR and FOOTER */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* TOP BAR (height 56px, bottom border 2px ink) */}
        <header
          style={{
            height: '56px',
            backgroundColor: 'var(--paper)',
            borderBottom: '2px solid var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          {/* Left side shows the page title in .t-head */}
          <div className="t-head" style={{ color: 'var(--ink)' }}>
            {getPageTitle(location.pathname)}
          </div>

          {/* Right side shows, in order: "Dataset: {name}" as plain text dropdown, a .btn "Add data", and text "Search ⌘K" in .mono */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Dataset: {name} as a plain text dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--ink-2)' }}>
              <span>Dataset:</span>
              <select
                value={activeRunId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setActiveRunId(id);
                  showToast(`Switched dataset to ${runs.find((r) => r.id === id)?.name || id}`);
                }}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'inherit',
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

            {/* .btn "Add data" */}
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/data?step=select')}
            >
              Add data
            </button>

            {/* Text "Search ⌘K" in .mono */}
            <span
              className="mono"
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                cursor: 'pointer',
                color: 'var(--ink-2)',
              }}
            >
              Search ⌘K
            </span>
          </div>
        </header>

        {/* Page Content Body */}
        <main style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--paper)' }}>
          <Outlet />
        </main>

        {/* FOOTER (one line, .mono, ink-2, top border 1px rule) */}
        <footer
          style={{
            height: '36px',
            borderTop: '1px solid var(--rule)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--paper)',
          }}
          className="mono"
        >
          <span style={{ color: 'var(--ink-2)', fontSize: '12px' }}>
            Demo data. Nothing here is real. A person confirms every action.
          </span>
        </footer>
      </div>
    </div>
  );
};
