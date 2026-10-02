import React from 'react';
import { BookOpen, GitFork, RotateCw, ArrowRightLeft, Cpu, Moon } from 'lucide-react';

export const PatternsGuide: React.FC = () => {
  const patterns = [
    {
      id: 'fan',
      title: '1. Fan-In / Fan-Out Accumulation Hub',
      icon: GitFork,
      color: '#E8590C',
      description:
        'A central mule account rapidly gathers deposits from 8–15 separate victim accounts within a tight window (e.g. 20 min), then splinters 90%+ of the total balance to multiple downstream mule accounts in under 15 min.',
      countermeasure:
        'Excluded Decoys: Payroll distributions only move one way (outward). Busy merchant accounts receive inbound transactions but never forward 90% immediately in parallel. Requiring both coordinated inflow and outflow protects legitimate commerce.',
      thresholds: 'N ≥ 6 senders in 30m, M ≥ 3 receivers in 60m, Forward Ratio ≥ 80%.',
    },
    {
      id: 'cycle',
      title: '2. Closed Cycle Layering Ring',
      icon: RotateCw,
      color: '#D9A441',
      description:
        'Funds are routed through a closed loop of 3 to 6 intermediary accounts (A → B → C → A) to obscure origin. Transfer amounts shrink predictably by 2–6% at each hop as transaction fees / mule cuts are deducted.',
      countermeasure:
        'Excluded Decoys: Legitimate e-commerce refund loops involve exact matching amounts over day-long spans. MuleTrace filters out cycles exceeding 60 minutes and requires chronological time-ordering with monotonic erosion.',
      thresholds: 'Length 3–6 hops, Total duration ≤ 60 minutes, Shrinkage ≤ 15%.',
    },
    {
      id: 'chain',
      title: '3. Pass-Through High-Speed Transit Chain',
      icon: ArrowRightLeft,
      color: '#6D4AFF',
      description:
        'A sequence of 3 or more conduit accounts where each account acts as an instant transit pass-through, forwarding 95–100% of inflow within 2–8 minutes, leaving a near-zero closing balance.',
      countermeasure:
        'Excluded Decoys: Legitimate consumer transfers maintain standing balances or delay outbound disbursements. Pass-through detection enforces both low holding latency (< 10m) and near-zero retained balance (< 5%).',
      thresholds: 'Forwarding ≥ 90%, Transit latency ≤ 10 min, Retained balance ≤ 5%.',
    },
    {
      id: 'cluster',
      title: '4. Device & Address Collusion Cluster',
      icon: Cpu,
      color: '#2F8F5B',
      description:
        'Recently opened accounts (under 30 days) operated by the same syndicate, sharing physical hardware device identifiers, residential address hash, or telecom KYC numbers.',
      countermeasure:
        'Excluded Decoys: Multi-person family devices or university Wi-Fi subnets involve older, established accounts. MuleTrace weights hardware devices higher than IP and discounts NAT subnets shared by accounts > 180 days old.',
      thresholds: 'Account age ≤ 30 days, ≥ 3 connected accounts via Union-Find.',
    },
    {
      id: 'dormancy',
      title: '5. Dormancy Sudden Awakening Burst',
      icon: Moon,
      color: '#8A8A92',
      description:
        'An account with zero transaction activity for 90+ days suddenly awakens to move high-velocity volumes matching a layered mule profile before falling silent again.',
      countermeasure:
        'Excluded Decoys: Salary spike accounts receive funds from an established corporate employer. MuleTrace requires sudden velocity bursts accompanied by high-speed outbound pass-through forwarding.',
      thresholds: 'Idle days ≥ 90, Concentration ratio ≥ 75% in < 4h, Forwarding ≥ 80%.',
    },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
          Mule Syndicate Detection Typologies
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
          Network graph rules and behavioral patterns designed specifically for Indian banking channels (UPI, IMPS, NEFT).
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {patterns.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: `${p.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: p.color,
                  }}
                >
                  <Icon size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{p.title}</h3>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.5', marginBottom: '12px' }}>
                {p.description}
              </p>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--ink-2)',
                  marginBottom: '10px',
                  lineHeight: '1.4',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>How False Positives Are Suppressed: </span>
                {p.countermeasure}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Production Rule Calibration: </span>
                <span className="mono" style={{ color: 'var(--accent)' }}>{p.thresholds}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
