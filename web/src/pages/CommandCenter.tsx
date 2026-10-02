import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type { DiscoveredRing, StatsResponse } from '../api/types';
import { formatLakhs } from '../lib/utils';
import { Dropzone } from '../components/data-hub/Dropzone';
import {
  ShieldAlert,
  ArrowUpRight,
  Lock,
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle,
  Zap,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedAccountId, setSelectedRingId, runs, fetchRuns, setStagedFiles, showToast } = useStore();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [rings, setRings] = useState<DiscoveredRing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRuns();
    Promise.all([api.getStats(), api.getDiscoveredRings()])
      .then(([s, r]) => {
        setStats(s);
        setRings(r);
      })
      .finally(() => setLoading(false));
  }, [fetchRuns]);

  // If no runs exist, show empty state with dropzone + use demo dataset
  if (!loading && runs.length === 0) {
    return (
      <div style={{ padding: '48px 28px', maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
            Welcome to MuleTrace
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            No transaction records or active detection runs found. Drop your bank records to initiate syndicate detection, or load the seeded demo dataset.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Dropzone
            onFilesSelected={(files) => {
              setStagedFiles(files);
              navigate('/data?step=select');
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Or explore immediate capabilities:</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await api.resetDemo();
                await fetchRuns();
                const [s, r] = await Promise.all([api.getStats(), api.getDiscoveredRings()]);
                setStats(s);
                setRings(r);
                showToast('Demo dataset loaded with 62k transactions and 5 rings.');
              } catch {
                showToast('Failed to load demo dataset.');
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            <Database size={13} />
            <span>Use Demo Dataset (Seed 42)</span>
          </button>
        </div>
      </div>
    );
  }

  // 7-day mock trend data
  const trendData = [
    { day: 'Day 1', transactions: 7800, flagged: 4, volumeLakhs: 82.4 },
    { day: 'Day 2', transactions: 8900, flagged: 6, volumeLakhs: 94.1 },
    { day: 'Day 3', transactions: 8400, flagged: 5, volumeLakhs: 88.7 },
    { day: 'Day 4', transactions: 9600, flagged: 9, volumeLakhs: 104.2 },
    { day: 'Day 5', transactions: 9100, flagged: 7, volumeLakhs: 96.5 },
    { day: 'Day 6', transactions: 10200, flagged: 11, volumeLakhs: 118.0 },
    { day: 'Day 7', transactions: 8218, flagged: 2, volumeLakhs: 87.3 },
  ];

  const handleInvestigateRing = (ring: DiscoveredRing) => {
    setSelectedRingId(ring.ring_id);
    if (ring.accounts.length > 0) {
      setSelectedAccountId(ring.accounts[0]);
    }
    navigate(`/workspace/${ring.accounts[0] || ''}`);
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Command Center
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Network-level mule syndicate monitoring and intervention platform.
          </p>
        </div>

        {/* Status Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            padding: '6px 12px',
            borderRadius: 'var(--radius)',
            fontSize: '12px',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ok)' }} />
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Live Ingest Active</span>
          <span style={{ color: 'var(--ink-3)' }}>•</span>
          <span className="mono" style={{ color: 'var(--ink-2)' }}>5,044 Accounts</span>
        </div>
      </div>

      {/* Next Best Action Banner */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: 'var(--accent-muted)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Zap size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
              Next Best Action: Review High-Risk Fan Hub ACC_05001
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
              ₹4.24L is currently poised for dispersion across 6 layered accounts. Min-cut optimizer recommends 1 freeze.
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedAccountId('ACC_05001');
            navigate('/workspace/ACC_05001');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>Triage Now</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Accounts Flagged
            </span>
            <ShieldAlert size={16} color="var(--risk-high)" />
          </div>
          <div className="mono" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            {loading ? '-' : stats?.flagged_count || 44}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            0.87% of monitored volume
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Stoppable ₹ (Min-Cut)
            </span>
            <Lock size={16} color="var(--ok)" />
          </div>
          <div className="mono" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ok)' }}>
            ₹13.4L
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            78.4% recoverable across 5 rings
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Discovered Rings
            </span>
            <Layers size={16} color="var(--accent)" />
          </div>
          <div className="mono" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            {rings.length || 5}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Louvain modularity 0.74
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Model Precision
            </span>
            <CheckCircle size={16} color="var(--ok)" />
          </div>
          <div className="mono" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            97.1%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }}>
            0 decoys flagged • Synthetic test
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Pattern Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Trend Area Chart */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                7-Day Inflow Volume & Anomaly Detections
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                Simulated transaction activity across 62,218 records.
              </p>
            </div>
            <span
              className="mono"
              style={{
                fontSize: '11px',
                color: 'var(--ink-3)',
                padding: '2px 8px',
                backgroundColor: 'var(--surface-raised)',
                borderRadius: '4px',
              }}
            >
              UTC Timestamps
            </span>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6D4AFF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6D4AFF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="var(--ink-3)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--ink-3)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  stroke="#6D4AFF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVol)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pattern Mix */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
              Detected Ring Typologies
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '16px' }}>
              Distribution of confirmed network patterns.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Fan-In / Fan-Out Hubs', count: 1, color: '#E8590C', share: '32%' },
                { label: 'Time-Bounded Cycles (3-5 hops)', count: 2, color: '#D9A441', share: '28%' },
                { label: 'Pass-Through Chains', count: 2, color: '#6D4AFF', share: '22%' },
                { label: 'Device/KYC Clusters', count: 2, color: '#2F8F5B', share: '12%' },
                { label: 'Dormancy Awakenings', count: 1, color: '#8A8A92', share: '6%' },
              ].map((p, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color }} />
                    <span style={{ fontSize: '12px', color: 'var(--ink)' }}>{p.label}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--ink-2)', fontWeight: 600 }}>
                    {p.count} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({p.share})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid var(--line)',
              fontSize: '11px',
              color: 'var(--ink-3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={13} color="var(--risk-mid)" />
            <span>Decoys (Payroll, Merchant, Family) successfully unflagged</span>
          </div>
        </div>
      </div>

      {/* Discovered Rings Table */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
              Discovered Mule Rings & Emergent Communities
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
              Identified via Louvain graph clustering and graph rule matching.
            </p>
          </div>

          <button
            onClick={() => navigate('/alerts')}
            style={{
              fontSize: '12px',
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            View All Alerts Queue →
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px' }}>RING ID</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px' }}>PATTERN</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px' }}>ACCOUNTS</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px' }}>INTERNAL FLOW</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px' }}>ESTIMATED AT RISK</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {rings.map((ring, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--line)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={() => handleInvestigateRing(ring)}
              >
                <td className="mono" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)' }}>
                  {ring.ring_id}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink)',
                    }}
                  >
                    {ring.pattern}
                  </span>
                </td>
                <td className="mono" style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>
                  {ring.accounts.length} accounts ({ring.accounts.slice(0, 2).join(', ')}...)
                </td>
                <td className="mono" style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>
                  {(ring.internal_flow_ratio * 100).toFixed(0)}%
                </td>
                <td className="mono" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--risk-high)' }}>
                  {formatLakhs(ring.estimated_at_risk)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInvestigateRing(ring);
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    Investigate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
