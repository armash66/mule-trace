import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDateTime } from '../lib/utils';
import { FileCheck2, Filter, Search } from 'lucide-react';

export const Audit: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    api.getAuditLog().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const filteredLogs = logs.filter((l) =>
    filterAction === 'all' ? true : l.action.toLowerCase().includes(filterAction.toLowerCase())
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
            Immutable Activity log
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Append-only tamper-evident log of all analyst decisions, risk overrides, and freeze dispatches.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600 }}>ACTION FILTER:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          >
            <option value="all">All Actions</option>
            <option value="confirm">Confirmations</option>
            <option value="clear">Clears</option>
            <option value="freeze">Freezes</option>
          </select>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontSize: '11px', width: '180px' }}>TIMESTAMP (UTC)</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontSize: '11px', width: '180px' }}>ACTION</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontSize: '11px', width: '140px' }}>ENTITY</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontSize: '11px', width: '140px' }}>ANALYST</th>
              <th style={{ padding: '10px 16px', color: 'var(--ink-3)', fontSize: '11px' }}>RATIONALE / AUDIT NOTE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)' }}>
                  Loading audit log...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)' }}>
                  No audit logs recorded matching filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="mono" style={{ padding: '12px 16px', color: 'var(--ink-2)', fontSize: '12px' }}>
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 6px',
                        backgroundColor: 'var(--surface-raised)',
                        border: '1px solid var(--line)',
                        fontWeight: 600,
                        color: log.action.includes('CONFIRM')
                          ? 'var(--confirmed)'
                          : log.action.includes('CLEAR')
                          ? 'var(--ok)'
                          : 'var(--accent)',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="mono" style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)' }}>
                    {log.entity_id}
                  </td>
                  <td className="mono" style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>
                    {log.analyst}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--ink)', fontSize: '12px' }}>
                    {log.note}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
