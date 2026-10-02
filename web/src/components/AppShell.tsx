import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import {
  LayoutDashboard, Upload, Briefcase, Hexagon, Search,
  Settings, Shield, BarChart3, Eye, Sun, Moon, LogOut,
  ChevronLeft, ChevronRight, Command,
} from 'lucide-react';

const navItems = [
  { to: '/app/command-center', icon: LayoutDashboard, label: 'Command Center' },
  { to: '/app/upload', icon: Upload, label: 'Upload' },
  { to: '/app/cases', icon: Briefcase, label: 'Cases' },
  { to: '/app/rings', icon: Hexagon, label: 'Rings' },
  { to: '/app/watchlist', icon: Eye, label: 'Watchlist' },
  { to: '/app/metrics', icon: BarChart3, label: 'Metrics' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
  { to: '/app/audit', icon: Shield, label: 'Audit' },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, theme, toggleTheme, logout, setCommandPaletteOpen } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-0)',
    }}>
      {/* Left rail */}
      <nav style={{
        width: collapsed ? 64 : 220,
        background: 'var(--bg-1)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--dur) var(--ease)',
        zIndex: 10,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--line)',
          height: 56,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#070A10',
          }}>
            MT
          </div>
          {!collapsed && (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '1rem',
              color: 'var(--text-0)',
            }}>
              MuleTrace
            </span>
          )}
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: '8px', overflow: 'auto' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px' : '10px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--accent)' : 'var(--text-1)',
                background: isActive ? 'rgba(45,212,191,.08)' : 'transparent',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? 500 : 400,
                transition: 'all var(--dur-fast) var(--ease)',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 2,
              })}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Bottom controls */}
        <div style={{
          padding: '8px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <button
            className="btn"
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', border: 'none', background: 'transparent', color: 'var(--text-1)', padding: '8px' }}
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span style={{ fontSize: '0.8rem' }}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button
            className="btn"
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', border: 'none', background: 'transparent', color: 'var(--text-1)', padding: '8px' }}
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut size={16} />
            {!collapsed && <span style={{ fontSize: '0.8rem' }}>Log out</span>}
          </button>
          <button
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-2)', padding: 8, display: 'flex',
              justifyContent: 'center',
            }}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 56,
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}>
          <button
            className="input"
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              width: 280,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text-2)',
              fontSize: '0.8rem',
            }}
          >
            <Search size={14} />
            Search accounts, cases, rings...
            <span style={{
              marginLeft: 'auto',
              padding: '2px 6px',
              background: 'var(--bg-3)',
              borderRadius: 4,
              fontSize: '0.7rem',
            }}>
              ⌘K
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Responsible-use banner */}
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--text-2)',
              padding: '4px 8px',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-sm)',
            }}>
              Scores support human decisions — never auto-freeze
            </span>

            {user && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px',
                background: 'var(--bg-2)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--accent-2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: 'white',
                }}>
                  {user.username[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-1)' }}>
                  {user.username}
                </span>
                <span className="badge" style={{
                  background: 'rgba(124,92,255,.15)',
                  color: 'var(--accent-2)',
                  fontSize: '0.65rem',
                }}>
                  {user.role}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
