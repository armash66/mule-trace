import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { configApi, weightsApi } from '../api/client';
import { Settings as SettingsIcon, Scale, RotateCcw, Check } from 'lucide-react';

export default function Settings() {
  const { data: thresholds } = useQuery({
    queryKey: ['thresholds'],
    queryFn: () => configApi.getThresholds().then((r: any) => r.data),
  });

  const { data: weights } = useQuery({
    queryKey: ['weights'],
    queryFn: () => weightsApi.get().then((r: any) => r.data),
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontFamily: ''Instrument Serif'', marginBottom: 4 }}>Settings</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem', marginBottom: 24 }}>
        Detection thresholds and learned signal weights.
      </p>

      {/* Thresholds */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingsIcon size={16} /> Detection Thresholds
        </h3>
        {thresholds && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 8,
          }}>
            {Object.entries(thresholds).map(([key, value]) => (
              <div key={key} style={{
                padding: '8px 12px',
                background: 'var(--paper-2)',
                borderRadius: '0px',
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.8rem',
              }}>
                <span style={{ color: 'var(--ink)' }}>
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="tabular-nums" style={{ color: 'var(--signal)', fontWeight: 500 }}>
                  {typeof value === 'number' ? value : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learned Weights */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale size={16} /> Learned Weights
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => weightsApi.reset()}>
              <RotateCcw size={12} /> Reset
            </button>
            <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => weightsApi.apply()}>
              <Check size={12} /> Apply
            </button>
          </div>
        </div>
        {weights && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(weights).map(([sig, data]: [string, any]) => (
              <div key={sig} style={{
                padding: '10px 14px',
                background: 'var(--paper-2)',
                borderRadius: '0px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {sig.replace('_', ' ')}
                  </span>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--ink-2)' }}>
                      Default: {data.default_weight}
                    </span>
                    <span style={{
                      color: data.delta > 0 ? 'var(--ok)' : data.delta < 0 ? 'var(--signal)' : 'var(--ink-2)',
                      fontWeight: 500,
                    }}>
                      Current: {data.learned_weight}
                      {data.delta !== 0 && ` (${data.delta > 0 ? '+' : ''}${data.delta_pct}%)`}
                    </span>
                  </div>
                </div>
                {/* Weight bar */}
                <div style={{ height: 4, background: 'var(--paper-2)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    width: `${data.learned_weight * 100 / 0.3}%`,
                    background: data.is_applied ? 'var(--signal)' : 'var(--ink-2)',
                    borderRadius: 2,
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: '0.7rem', color: 'var(--ink-2)' }}>
                  <span>✓ {data.confirmed_hits} confirmed</span>
                  <span>✕ {data.cleared_hits} cleared</span>
                  {data.is_applied && <span style={{ color: 'var(--signal)' }}>● Applied</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
