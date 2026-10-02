import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/client';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function Audit() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => auditApi.list({ limit: 100 }).then(r => r.data),
  });

  const { data: verification } = useQuery({
    queryKey: ['audit-verify'],
    queryFn: () => auditApi.verify().then(r => r.data),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>Audit Log</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            Hash-chained, tamper-evident record of all actions.
          </p>
        </div>
        {verification && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px',
            background: verification.valid ? 'rgba(34,197,94,.08)' : 'rgba(255,77,94,.08)',
            border: `1px solid ${verification.valid ? 'rgba(34,197,94,.2)' : 'rgba(255,77,94,.2)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            color: verification.valid ? 'var(--ok)' : 'var(--danger)',
          }}>
            {verification.valid ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            Chain: {verification.valid ? 'Verified' : 'BROKEN'}
            {verification.total_entries && ` (${verification.total_entries} entries)`}
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...Array(10)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {entries.map((e: any) => (
            <div key={e.id} style={{
              padding: '10px 14px',
              background: 'var(--bg-1)',
              borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: '0.8rem',
            }}>
              <Shield size={14} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
              <span className="mono" style={{ color: 'var(--accent)', minWidth: 140 }}>
                {e.action}
              </span>
              <span style={{ color: 'var(--text-1)', minWidth: 100 }}>
                {e.username}
              </span>
              <span style={{ flex: 1, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.entity_type && `${e.entity_type}: ${e.entity_id || ''}`}
                {e.details && ` — ${JSON.stringify(e.details).slice(0, 80)}`}
              </span>
              <span className="mono" style={{ color: 'var(--text-2)', fontSize: '0.7rem', flexShrink: 0 }}>
                {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
