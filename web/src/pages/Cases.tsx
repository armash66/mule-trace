import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { casesApi } from '../api/client';
import { Briefcase, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  UNREVIEWED: 'var(--text-2)',
  IN_REVIEW: 'var(--accent)',
  FREEZE_DRAFTED: 'var(--warn)',
  FREEZE_APPROVED: 'var(--ok)',
  CLOSED: 'var(--text-2)',
};

export default function Cases() {
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesApi.list().then(r => r.data),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>Cases</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            Group related alerts into cases for investigation.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          const title = prompt('Case title:');
          if (title) casesApi.create({ title, alert_ids: [] });
        }}>
          + New Case
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : cases.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
          <Briefcase size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No cases yet. Confirm alerts to create cases.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {cases.map((c: any) => (
            <div key={c.id} className="card" style={{
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                background: 'rgba(124,92,255,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Briefcase size={18} style={{ color: 'var(--accent-2)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{c.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', display: 'flex', gap: 16 }}>
                  <span>{c.total_accounts || 0} accounts</span>
                  <span>₹{(c.total_flow || 0).toLocaleString()}</span>
                  {c.ring_id && <span>Ring: {c.ring_id}</span>}
                </div>
              </div>
              <span className="badge" style={{
                color: statusColors[c.status] || 'var(--text-2)',
                background: `${statusColors[c.status] || 'var(--text-2)'}15`,
              }}>
                {c.status?.replace('_', ' ')}
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                <Clock size={12} style={{ marginRight: 4 }} />
                {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
