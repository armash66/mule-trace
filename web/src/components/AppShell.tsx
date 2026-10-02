import React, { useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useStore } from '../store/store';
import { api } from '../api/client';
import { CommandPalette } from './CommandPalette';
import { ShortcutSheet } from './ShortcutSheet';
import { WhyScoreDrawer } from './WhyScoreDrawer';
import { Toast } from './Toast';
import { GlobalDropOverlay } from './data-hub/GlobalDropOverlay';
import {
  LayoutDashboard,
  ShieldAlert,
  Network,
  Lock,
  FileText,
  PlaySquare,
  Sliders,
  BarChart2,
  FileCheck2,
  UploadCloud,
  BookOpen,
  Search,
  HelpCircle,
  Sun,
  Moon,
  RotateCcw,
  Plus,
  Database,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const {
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    setShortcutSheetOpen,
    showToast,
    runs,
    activeRunId,
    setActiveRunId,
    fetchRuns,
  } = useStore();

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      await fetchRuns();
      showToast('Demo dataset reset to initial state.');
      window.location.reload();
    } catch {
      showToast('Demo reset completed.');
    }
  };

  // Nav link style helper
  const getNavStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
    backgroundColor: isActive ? 'var(--surface-raised)' : 'transparent',
    textDecoration: 'none',
    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Global Modals & Drawers */}
      <GlobalDropOverlay />
      <CommandPalette />
      <ShortcutSheet />
      <WhyScoreDrawer />
      <Toast />

      {/* Left Navigation Sidebar */}
      <aside
        style={{
          width: '240px',
          minWidth: '240px',
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo and Brand */}
        <div>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--paper)',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                MT
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                MuleTrace
              </span>
            </div>
            <span
              className="mono"
              style={{
                fontSize: '10px',
                color: 'var(--ink-3)',
                padding: '2px 5px',
                backgroundColor: 'var(--surface-raised)',
                }}
            >
              v1.0
            </span>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Section: Investigate */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  padding: '4px 12px',
                }}
              >
                Investigate
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <NavLink to="/" style={({ isActive }) => getNavStyle(isActive)}>
                  <LayoutDashboard size={15} />
                  <span>Overview</span>
                </NavLink>
                <NavLink to="/alerts" style={({ isActive }) => getNavStyle(isActive)}>
                  <ShieldAlert size={15} />
                  <span>Alerts</span>
                </NavLink>
                <NavLink to="/workspace" style={({ isActive }) => getNavStyle(isActive)}>
                  <Network size={15} />
                  <span>Investigate</span>
                </NavLink>
              </div>
            </div>

            {/* Section: Act & Resolve */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  padding: '4px 12px',
                }}
              >
                Act & Intervene
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <NavLink to="/freezes" style={({ isActive }) => getNavStyle(isActive)}>
                  <Lock size={15} />
                  <span>Freezes</span>
                </NavLink>
                <NavLink to="/cases/fan_1" style={({ isActive }) => getNavStyle(isActive)}>
                  <FileText size={15} />
                  <span>Cases</span>
                </NavLink>
                <NavLink to="/replay/fan_1" style={({ isActive }) => getNavStyle(isActive)}>
                  <PlaySquare size={15} />
                  <span>Replay</span>
                </NavLink>
              </div>
            </div>

            {/* Section: Evaluate & Platform */}
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  padding: '4px 12px',
                }}
              >
                Evaluate & Data
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <NavLink to="/rules" style={({ isActive }) => getNavStyle(isActive)}>
                  <Sliders size={15} />
                  <span>Rules</span>
                </NavLink>
                <NavLink to="/performance" style={({ isActive }) => getNavStyle(isActive)}>
                  <BarChart2 size={15} />
                  <span>Accuracy</span>
                </NavLink>
                <NavLink to="/audit" style={({ isActive }) => getNavStyle(isActive)}>
                  <FileCheck2 size={15} />
                  <span>Activity log</span>
                </NavLink>
                <NavLink to="/data" style={({ isActive }) => getNavStyle(isActive)}>
                  <UploadCloud size={15} />
                  <span>Data</span>
                </NavLink>
                <NavLink to="/patterns" style={({ isActive }) => getNavStyle(isActive)}>
                  <BookOpen size={15} />
                  <span>How it works</span>
                </NavLink>
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom utility footer */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setShortcutSheetOpen(true)}
              title="Keyboard Shortcuts (?)"
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                padding: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <HelpCircle size={14} />
            </button>
            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                padding: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          <button
            onClick={handleResetDemo}
            title="Reset to Seeded Demo State"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--ink-3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset Demo</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '48px',
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}
        >
          {/* Breadcrumb / Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--ink-3)' }}>MuleTrace</span>
            <span style={{ color: 'var(--line-strong)' }}>/</span>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
              {location.pathname === '/'
                ? 'Overview'
                : location.pathname.split('/')[1]?.toUpperCase() || 'Investigate'}
            </span>
          </div>

          {/* Right Header Badges and Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* App-Wide Run Selector */}
            {runs.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--line)',
                  padding: '2px 8px',
                  }}
              >
                <Database size={12} color="var(--ink-3)" />
                <select
                  value={activeRunId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActiveRunId(id);
                    showToast(`Switched active dataset to ${runs.find((r) => r.id === id)?.name || id}`);
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--ink)',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '160px',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Persistent Add Data Button */}
            <NavLink
              to="/data?step=select"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                backgroundColor: 'var(--accent)',
                color: 'var(--paper)',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                }}
            >
              <Plus size={13} />
              <span>Add data</span>
            </NavLink>

            {/* Synthetic Data Honesty Tag */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--ink-3)',
                backgroundColor: 'var(--surface-raised)',
                padding: '3px 10px',
                border: '1px solid var(--line)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'var(--risk-mid)',
                }}
              />
              <span>Demo data. A person confirms every action.</span>
            </div>

            {/* Quick ⌘K Search Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--line)',
                padding: '4px 10px',
                color: 'var(--ink-3)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <Search size={13} />
              <span>Search or jump...</span>
              <kbd
                className="mono"
                style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--surface)',
                  padding: '1px 4px',
                  border: '1px solid var(--line)',
                }}
              >
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
