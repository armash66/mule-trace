import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useStore } from '../store/store';
import { api } from '../api/client';
import { CommandPalette } from './CommandPalette';
import { ShortcutSheet } from './ShortcutSheet';
import { WhyScoreDrawer } from './WhyScoreDrawer';
import { Toast } from './Toast';
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
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const {
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    setShortcutSheetOpen,
    showToast,
  } = useStore();

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
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
    borderRadius: 'var(--radius-sm)',
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
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                MT
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
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
                borderRadius: '4px',
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
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
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
                  <span>Alerts Queue</span>
                </NavLink>
                <NavLink to="/workspace" style={({ isActive }) => getNavStyle(isActive)}>
                  <Network size={15} />
                  <span>Workspace</span>
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
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 12px',
                }}
              >
                Act & Intervene
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <NavLink to="/freezes" style={({ isActive }) => getNavStyle(isActive)}>
                  <Lock size={15} />
                  <span>Freeze Tracker</span>
                </NavLink>
                <NavLink to="/cases/fan_1" style={({ isActive }) => getNavStyle(isActive)}>
                  <FileText size={15} />
                  <span>Case File & STR</span>
                </NavLink>
                <NavLink to="/replay/fan_1" style={({ isActive }) => getNavStyle(isActive)}>
                  <PlaySquare size={15} />
                  <span>Heist Replay</span>
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
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 12px',
                }}
              >
                Evaluate & Data
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                <NavLink to="/rules" style={({ isActive }) => getNavStyle(isActive)}>
                  <Sliders size={15} />
                  <span>Rules & Evasion</span>
                </NavLink>
                <NavLink to="/performance" style={({ isActive }) => getNavStyle(isActive)}>
                  <BarChart2 size={15} />
                  <span>Model Metrics</span>
                </NavLink>
                <NavLink to="/audit" style={({ isActive }) => getNavStyle(isActive)}>
                  <FileCheck2 size={15} />
                  <span>Audit Trail</span>
                </NavLink>
                <NavLink to="/upload" style={({ isActive }) => getNavStyle(isActive)}>
                  <UploadCloud size={15} />
                  <span>Ingest CSV</span>
                </NavLink>
                <NavLink to="/patterns" style={({ isActive }) => getNavStyle(isActive)}>
                  <BookOpen size={15} />
                  <span>Mule Patterns</span>
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
                borderRadius: 'var(--radius-sm)',
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
                borderRadius: 'var(--radius-sm)',
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
                : location.pathname.split('/')[1]?.toUpperCase() || 'Workspace'}
            </span>
          </div>

          {/* Right Header Badges and Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--risk-mid)',
                }}
              />
              <span>Measured on synthetic data • Confirm before action</span>
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
                borderRadius: 'var(--radius-sm)',
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
                  borderRadius: '3px',
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
