import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

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
      description: 'Standard weights for retail banking. Balances recall and false positive rate.',
      thresholds: 'Fan hub: 8 hops/20m • Cycle: ≤5 hops/45m • Chain: 4 hops/8m',
    },
    {
      id: 'strict',
      name: 'Strict (Low False Positives)',
      description: 'Higher thresholds requiring denser flow concentration and tighter temporal windows.',
      thresholds: 'Fan hub: 12 hops/15m • Cycle: ≤4 hops/30m • Chain: 5 hops/5m',
    },
    {
      id: 'sensitive',
      name: 'Sensitive (High Recall)',
      description: 'Aggressive detection designed for fast evasion tactics, lower hop thresholds.',
      thresholds: 'Fan hub: 6 hops/30m • Cycle: ≤6 hops/60m • Chain: 3 hops/12m',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onStart(name.trim(), preset);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label htmlFor="run-name" className="mono" style={{ color: 'var(--ink)' }}>
          Run name
        </label>
        <input
          id="run-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Upload 02-10-2026"
          className="mono"
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            border: '1px solid var(--rule)',
            backgroundColor: 'var(--paper)',
            color: 'var(--ink)',
            outline: 'none',
            maxWidth: '480px',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="mono" style={{ color: 'var(--ink)' }}>
            Preset
          </label>
          <NavLink
            to="/rules"
            target="_blank"
            className="mono"
            style={{
              color: 'var(--ink-2)',
              textDecoration: 'underline',
            }}
          >
            Inspect in Rules
          </NavLink>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {presets.map((p) => {
            const isSelected = preset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setPreset(p.id as any)}
                style={{
                  padding: '16px',
                  backgroundColor: isSelected ? 'var(--paper-2)' : 'var(--paper)',
                  border: isSelected ? '2px solid var(--ink)' : '1px solid var(--rule)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                    {p.name}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.4, flex: 1 }}>
                  {p.description}
                </p>
                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    color: 'var(--ink-2)',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--rule)',
                  }}
                >
                  {p.thresholds}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: '1px solid var(--rule)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={isStarting}
          className="btn-ghost"
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Back
        </button>

        <button
          type="submit"
          disabled={isStarting || !name.trim()}
          className="btn"
        >
          {isStarting ? 'Starting run...' : 'Start pipeline'}
        </button>
      </div>
    </form>
  );
};
