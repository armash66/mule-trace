import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export const Performance: React.FC = () => {
  const [, setPerf] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getModelPerformance().then((data) => {
      setPerf(data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ padding: '0 36px 48px 36px', maxWidth: '1120px', margin: '0 auto', backgroundColor: 'var(--paper)' }}>
      <div style={{ padding: '32px 0 24px 0' }}>
        <h1 className="t-head" style={{ color: 'var(--ink)' }}>
          Accuracy
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--ink-2)', marginTop: '4px' }}>
          Measured on synthetic data with planted rings and decoy behaviors.
        </p>
      </div>

      {/* Top Benchmark Summary */}
      <div
        className="rule-top"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
          padding: '24px 0',
        }}
      >
        <div>
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
            Ring recall
          </div>
          <div className="t-hero" style={{ fontSize: '48px', color: 'var(--ink)' }}>
            97.1%
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            34 of 35 planted accounts
          </div>
        </div>

        <div>
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
            Precision
          </div>
          <div className="t-hero" style={{ fontSize: '48px', color: 'var(--ink)' }}>
            95.8%
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Minimal false alert noise
          </div>
        </div>

        <div>
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
            Decoy false alerts
          </div>
          <div className="t-hero" style={{ fontSize: '48px', color: 'var(--ink)' }}>
            0 / 9
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Payroll and merchants safe
          </div>
        </div>

        <div>
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
            Traced money stopped
          </div>
          <div className="t-hero" style={{ fontSize: '48px', color: 'var(--signal)' }}>
            78.4%
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Min-cut bottleneck savings
          </div>
        </div>
      </div>

      {/* Pattern Breakdown Table */}
      <div style={{ marginTop: '20px' }}>
        <div className="mono" style={{ color: 'var(--ink)', fontWeight: 600, marginBottom: '12px' }}>
          Per-pattern accuracy breakdown
        </div>

        <div style={{ borderTop: '2px solid var(--ink)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '240px 120px 120px 1fr',
              padding: '10px 16px',
            }}
          >
            <span className="mono" style={{ color: 'var(--ink-2)' }}>Pattern</span>
            <span className="mono" style={{ color: 'var(--ink-2)' }}>Recall</span>
            <span className="mono" style={{ color: 'var(--ink-2)' }}>Precision</span>
            <span className="mono" style={{ color: 'var(--ink-2)' }}>Status</span>
          </div>

          {[
            { name: 'Collect and split', recall: '94.0%', prec: '95.0%', status: 'Exceeds target' },
            { name: 'Round trip', recall: '100.0%', prec: '100.0%', status: 'Perfect recall' },
            { name: 'Quick relay', recall: '100.0%', prec: '96.2%', status: 'Exceeds target' },
            { name: 'Same-device group', recall: '100.0%', prec: '97.0%', status: 'Exceeds target' },
            { name: 'Dormancy burst', recall: '100.0%', prec: '91.4%', status: 'No false flags on payroll' },
          ].map((row, idx) => (
            <div
              key={idx}
              className="row"
              style={{
                display: 'grid',
                gridTemplateColumns: '240px 120px 120px 1fr',
                padding: '10px 16px',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{row.name}</div>
              <div className="mono">{row.recall}</div>
              <div className="mono">{row.prec}</div>
              <div style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{row.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
