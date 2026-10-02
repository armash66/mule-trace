import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Sliders, ArrowRight, Play, ExternalLink } from 'lucide-react';

interface RunConfigStepProps {
  defaultName: string;
  onStart: (name: string, configPreset: string) => void;
  onBack: () => void;
  isStarting: boolean;
}

export const RunConfigStep: React.FC<RunConfigStepProps> = ({
  defaultName,
  onStart,
  onBack,
  isStarting,
}) => {
  const [name, setName] = useState(defaultName);
  const [preset, setPreset] = useState<'default' | 'strict' | 'sensitive'>('default');

  const presets = [
    {
      id: 'default',
      name: 'Default (Balanced)',
      description: 'Standard weights for retail banking. Balances recall and false positive rate. Recommended for typical batch runs.',
      thresholds: 'Fan hub: 8 hops/20m • Cycle: ≤5 hops/45m • Chain: 4 hops/8m',
    },
    {
      id: 'strict',
      name: 'Strict (Low False Positives)',
      description: 'Higher thresholds requiring denser flow concentration and tighter temporal windows. Best for high-volume clearing.',
      thresholds: 'Fan hub: 12 hops/15m • Cycle: ≤4 hops/30m • Chain: 5 hops/5m',
    },
    {
      id: 'sensitive',
      name: 'Sensitive (High Recall)',
      description: 'Aggressive detection designed for fast evasion tactics, lower hop thresholds, and micro-layering.',
      thresholds: 'Fan hub: 6 hops/30m • Cycle: ≤6 hops/60m • Chain: 3 hops/12m',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onStart(name.trim(), preset);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label htmlFor="run-name" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
          Run Name & Identifier
        </label>
        <input
          id="run-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Upload 02-10-2026 • 03:12 PM"
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            border: '1px solid var(--line-strong)',
            backgroundColor: 'var(--surface)',
            color: 'var(--ink)',
            outline: 'none',
            maxWidth: '480px',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
          An intuitive title for finding this batch in historical runs and reports.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Detection Algorithm Preset
          </label>
          <NavLink
            to="/rules"
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <span>Inspect in Rules Lab</span>
            <ExternalLink size={11} />
          </NavLink>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {presets.map((p) => {
            const isSelected = preset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setPreset(p.id as any)}
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--surface)',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.12s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {p.name}
                  </span>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: isSelected ? '4px solid var(--accent)' : '1px solid var(--line-strong)',
                      backgroundColor: 'var(--surface)',
                    }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--ink-2)', lineHeight: 1.4, flex: 1 }}>
                  {p.description}
                </p>
                <div
                  className="mono"
                  style={{
                    fontSize: '10px',
                    color: 'var(--ink-3)',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  {p.thresholds}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Honesty note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--line)',
          fontSize: '12px',
          color: 'var(--ink-3)',
        }}
      >
        <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--risk-mid)' }} />
        <span>Outputs are flagged for review and recommended action. Mules may be unaware victims; confirm before freeze.</span>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid var(--line)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={isStarting}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid var(--line)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          Back
        </button>

        <button
          type="submit"
          disabled={isStarting || !name.trim()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 24px',
            backgroundColor: 'var(--accent)',
            color: 'var(--paper)',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isStarting ? 'wait' : 'pointer',
          }}
        >
          <Play size={14} fill="var(--paper)" />
          <span>{isStarting ? 'Initiating Pipeline...' : 'Start Detection Pipeline'}</span>
        </button>
      </div>
    </form>
  );
};
