import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '../api/client';
import { BarChart3, AlertTriangle, Briefcase, Hexagon, Shield, TrendingUp } from 'lucide-react';

export default function Metrics() {
  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => metricsApi.summary().then(r => r.data),
  });

  const { data: benchmark } = useQuery({
    queryKey: ['benchmark'],
    queryFn: () => metricsApi.benchmark().then(r => r.data),
  });

  const kpis = metrics ? [
    { label: 'Total Runs', value: metrics.total_runs, icon: TrendingUp, color: 'var(--accent)' },
    { label: 'Total Alerts', value: metrics.total_alerts, icon: AlertTriangle, color: 'var(--risk-high)' },
    { label: 'Critical Alerts', value: metrics.critical_count, icon: Shield, color: 'var(--risk-crit)' },
    { label: 'Cases', value: metrics.total_cases, icon: Briefcase, color: 'var(--accent-2)' },
    { label: 'Open Cases', value: metrics.open_cases, icon: Briefcase, color: 'var(--warn)' },
    { label: 'Rings', value: metrics.ring_count, icon: Hexagon, color: 'var(--accent-3)' },
  ] : [];

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>Metrics</h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: 24 }}>
        Key performance indicators and detection benchmarks.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16, marginBottom: 32,
      }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card" style={{
            padding: 20,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: `${kpi.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <kpi.icon size={18} style={{ color: kpi.color }} />
            </div>
            <div className="tabular-nums" style={{ fontSize: '2rem', fontWeight: 700, color: kpi.color }}>
              {kpi.value?.toLocaleString() ?? '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Benchmark */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={16} /> Detection Benchmark
        </h3>
        {benchmark?.precision != null ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { label: 'Precision', value: benchmark.precision, target: 0.85 },
              { label: 'Recall', value: benchmark.recall, target: 0.80 },
              { label: 'F1 Score', value: benchmark.f1, target: 0.82 },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div className="tabular-nums" style={{
                  fontSize: '2rem', fontWeight: 700,
                  color: m.value >= m.target ? 'var(--ok)' : 'var(--warn)',
                }}>
                  {(m.value * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{m.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>Target: {(m.target * 100)}%</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            {benchmark?.note || 'Run the benchmark to see precision/recall metrics.'}
          </p>
        )}
      </div>
    </div>
  );
}
