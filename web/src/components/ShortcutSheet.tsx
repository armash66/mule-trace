import React from 'react';
import { useStore } from '../store/store';
import { X, Command } from 'lucide-react';

export const ShortcutSheet: React.FC = () => {
  const { shortcutSheetOpen, setShortcutSheetOpen } = useStore();

  if (!shortcutSheetOpen) return null;

  const shortcuts = [
    { key: 'J / ↓', desc: 'Select next alert in queue' },
    { key: 'K / ↑', desc: 'Select previous alert in queue' },
    { key: 'Enter', desc: 'Inspect account in 3-pane Workspace' },
    { key: 'C', desc: 'Confirm Mule (triggers risk uplift via PageRank)' },
    { key: 'X', desc: 'Clear Account (benign / false positive)' },
    { key: 'F', desc: 'Generate Min-Cut Freeze Plan' },
    { key: 'R', desc: 'Open Heist Replay simulator' },
    { key: 'W', desc: 'Open "Why this score?" (SHAP explanation)' },
    { key: '⌘K / Ctrl+K', desc: 'Open Command Palette & Jump' },
    { key: '?', desc: 'Toggle keyboard shortcuts sheet' },
    { key: 'Esc', desc: 'Dismiss active modal or drawer' },
  ];

  return (
    <div
      onClick={() => setShortcutSheetOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '480px',
          maxWidth: '92vw',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Command size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={() => setShortcutSheetOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{s.desc}</span>
                <span
                  className="mono"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--line)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                  }}
                >
                  {s.key}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-raised)',
            borderTop: '1px solid var(--line)',
            fontSize: '12px',
            color: 'var(--ink-3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>All shortcuts are active on Queue & Workspace</span>
          <span className="mono">Esc to close</span>
        </div>
      </div>
    </div>
  );
};
