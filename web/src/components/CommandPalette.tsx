import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import {
  Search,
  ShieldAlert,
  Network,
  Lock,
  FileText,
  PlaySquare,
  Sliders,
  BarChart2,
  FileCheck2,
  UploadCloud,
  Home,
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, setSelectedAccountId, setSelectedRingId, showToast } =
    useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const navigateTo = (path: string) => {
    navigate(path);
    setCommandPaletteOpen(false);
  };

  const jumpToAccount = (accId: string) => {
    setSelectedAccountId(accId);
    navigateTo(`/workspace/${accId}`);
  };

  const jumpToRing = (ringId: string) => {
    setSelectedRingId(ringId);
    navigateTo(`/cases/${ringId}`);
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '90vw',
          backgroundColor: 'var(--paper)',
          border: '1px solid var(--rule)',
          overflow: 'hidden',
        }}
      >
        <Command label="MuleTrace Quick Jump">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--rule)',
              gap: '10px',
            }}
          >
            <Search size={16} color="var(--ink-2)" />
            <Command.Input
              placeholder="Search accounts (ACC_05001), rings, or navigate..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--ink)',
                fontSize: '14px',
                fontFamily: 'Inter',
              }}
              autoFocus
            />
            <span
              style={{
                fontSize: '11px',
                color: 'var(--ink-2)',
                padding: '2px 6px',
                border: '1px solid var(--rule)',
                fontFamily: ''JetBrains Mono'',
              }}
            >
              ESC
            </span>
          </div>

          <Command.List
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            <Command.Empty
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--ink-2)',
                fontSize: '13px',
              }}
            >
              No matching accounts or screens found.
            </Command.Empty>

            <Command.Group heading="QUICK JUMP TO SCREEN" style={{ color: 'var(--ink-2)', fontSize: '11px', padding: '6px 8px', fontWeight: 600 }}>
              <Command.Item
                onSelect={() => navigateTo('/')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <Home size={15} color="var(--ink-2)" />
                <span>Command Center (Overview)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/alerts')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <ShieldAlert size={15} color="var(--ink-2)" />
                <span>Alerts (Triage)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/workspace')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <Network size={15} color="var(--ink-2)" />
                <span>Investigation Investigate (3-Pane Hero)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/freezes')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <Lock size={15} color="var(--ink-2)" />
                <span>Freezes (Kanban)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/cases/fan_1')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <FileText size={15} color="var(--ink-2)" />
                <span>Cases & report draft</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/replay/fan_1')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <PlaySquare size={15} color="var(--ink-2)" />
                <span>Replay Simulator</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/rules')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <Sliders size={15} color="var(--ink-2)" />
                <span>Rules</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/performance')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <BarChart2 size={15} color="var(--ink-2)" />
                <span>Accuracy</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/upload')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <UploadCloud size={15} color="var(--ink-2)" />
                <span>Ingest CSV Data</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('/audit')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <FileCheck2 size={15} color="var(--ink-2)" />
                <span>Activity log (Append-Only)</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="PLANTED RINGS & HUBS" style={{ color: 'var(--ink-2)', fontSize: '11px', padding: '6px 8px', fontWeight: 600 }}>
              <Command.Item
                onSelect={() => jumpToAccount('ACC_05001')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <span>ACC_05001 — Collect and split (11 accounts, ₹4.24L)</span>
                <span className="mono" style={{ color: 'var(--signal)', fontWeight: 600 }}>96</span>
              </Command.Item>
              <Command.Item
                onSelect={() => jumpToAccount('ACC_05008')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <span>ACC_05008 — 3-Hop Cycle Ring (₹1.62L)</span>
                <span className="mono" style={{ color: 'var(--signal)', fontWeight: 600 }}>94</span>
              </Command.Item>
              <Command.Item
                onSelect={() => jumpToAccount('ACC_05016')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <span>ACC_05016 — Quick relay (₹2.10L)</span>
                <span className="mono" style={{ color: 'var(--signal)', fontWeight: 600 }}>91</span>
              </Command.Item>
              <Command.Item
                onSelect={() => jumpToAccount('ACC_05026')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <span>ACC_05026 — Device Collision Cluster (DEV_MULE_99)</span>
                <span className="mono" style={{ color: 'var(--signal)', fontWeight: 600 }}>88</span>
              </Command.Item>
              <Command.Item
                onSelect={() => jumpToAccount('ACC_05044')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--ink)',
                  fontSize: '13px',
                }}
              >
                <span>ACC_05044 — Dormancy Sudden Awakening (142d idle)</span>
                <span className="mono" style={{ color: 'var(--signal)', fontWeight: 600 }}>86</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
