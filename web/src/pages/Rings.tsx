import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ringsApi } from '../api/client';
import { Hexagon, Users, ArrowRightLeft, Clock } from 'lucide-react';

export default function Rings() {
  const { data: rings = [], isLoading } = useQuery({
    queryKey: ['rings'],
    queryFn: () => ringsApi.list().then((r: any) => r.data),
  });

  return (
    <div>
      <h2 style={{ fontFamily: ''Instrument Serif'', marginBottom: 4 }}>Rings</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem', marginBottom: 24 }}>
        Detected mule rings — communities of suspicious accounts transacting together.
      </p>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}
        </div>
      ) : rings.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-2)' }}>
          <Hexagon size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No rings detected yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {rings.map((ring: any) => (
            <div key={ring.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 36, height: 36,
                    background: 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Hexagon size={16} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{ring.ring_label}</div>
                    <span className="badge" style={{
                      background: ring.risk_score >= 70 ? 'rgba(255,77,94,.12)' : 'rgba(245,184,61,.12)',
                      color: ring.risk_score >= 70 ? 'var(--signal)' : 'var(--signal)',
                    }}>
                      Risk: {Math.round(ring.risk_score)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 8, marginBottom: 12,
              }}>
                <div style={{ padding: '8px 12px', background: 'var(--paper-2)', borderRadius: '0px' }}>
                  <Users size={14} style={{ color: 'var(--ink-2)', marginBottom: 2 }} />
                  <div className="tabular-nums" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {ring.member_count}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink-2)' }}>Members</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--paper-2)', borderRadius: '0px' }}>
                  <ArrowRightLeft size={14} style={{ color: 'var(--ink-2)', marginBottom: 2 }} />
                  <div className="tabular-nums" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    ₹{(ring.total_flow || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink-2)' }}>Total Flow</div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--ink-2)', display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--ok)' }}>
                  ↓ {(ring.entry_accounts || []).length} entry
                </span>
                <span style={{ color: 'var(--signal)' }}>
                  ↑ {(ring.exit_accounts || []).length} exit
                </span>
                <span>
                  <Clock size={11} /> {Math.round(ring.time_span_minutes || 0)}min
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
