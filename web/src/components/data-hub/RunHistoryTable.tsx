import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useStore } from '../../store/store';
import type { RunItem } from '../../api/types';
import { formatDateTime } from '../../lib/utils';

interface RunHistoryTableProps {
  runs: RunItem[];
  onRefresh: () => void;
  onRerun: (run: RunItem) => void;
}

export const RunHistoryTable: React.FC<RunHistoryTableProps> = ({ runs, onRefresh, onRerun }) => {
  const navigate = useNavigate();
  const { activeRunId, setActiveRunId, showToast } = useStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleMakeActive = async (runId: string) => {
    try {
      await api.updateRun(runId, { is_active: true });
      setActiveRunId(runId);
      onRefresh();
      showToast('Active run updated.');
    } catch {
      showToast('Failed to activate run.');
    }
  };

  const handleOpenRun = (runId: string) => {
    setActiveRunId(runId);
    navigate('/overview');
  };

  const startRename = (run: RunItem) => {
    setRenamingId(run.id);
    setNewName(run.name);
  };

  const submitRename = async (runId: string) => {
    if (!newName.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await api.updateRun(runId, { name: newName.trim() });
      setRenamingId(null);
      onRefresh();
      showToast('Run renamed.');
    } catch {
      showToast('Failed to rename run.');
    }
  };

  const handleDelete = (run: RunItem) => {
    let cancelled = false;
    showToast(`Run "${run.name}" deleted.`, () => {
      cancelled = true;
      showToast(`Restored "${run.name}".`);
      onRefresh();
    });

    setTimeout(async () => {
      if (!cancelled) {
        try {
          await api.deleteRun(run.id);
          onRefresh();
        } catch {
          // ignore
        }
      }
    }, 5000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="t-head" style={{ color: 'var(--ink)' }}>
          Run history
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="mono"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ borderTop: '2px solid var(--ink)' }}>
        {runs.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center' }} className="mono">
            <span style={{ color: 'var(--ink-2)' }}>No runs yet. Drop a file above to start.</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', width: '28%' }}>Name</th>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', width: '20%' }}>Created</th>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', width: '12%' }}>Source</th>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', width: '10%' }}>Rows</th>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', width: '10%' }}>Flagged</th>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', width: '10%' }}>Status</th>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const isActive = activeRunId === run.id;

                return (
                  <tr key={run.id} className="row">
                    {/* Name */}
                    <td style={{ padding: '10px 12px' }}>
                      {renamingId === run.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename(run.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            autoFocus
                            className="mono"
                            style={{
                              padding: '2px 6px',
                              border: '1px solid var(--ink)',
                              background: 'var(--paper)',
                              color: 'var(--ink)',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => submitRename(run.id)}
                            className="mono"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{run.name}</span>
                          {isActive && (
                            <span className="mono" style={{ color: 'var(--ink-2)' }}>
                              [active]
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startRename(run)}
                            className="mono"
                            style={{ background: 'transparent', border: 'none', color: 'var(--ink-2)', cursor: 'pointer' }}
                          >
                            edit
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Created */}
                    <td className="mono" style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                      {formatDateTime(run.created_at)}
                    </td>

                    {/* Source */}
                    <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                      {run.source}
                    </td>

                    {/* Rows */}
                    <td className="mono" style={{ padding: '10px 12px' }}>
                      {run.txn_count?.toLocaleString() || '—'}
                    </td>

                    {/* Flagged */}
                    <td className="mono" style={{ padding: '10px 12px', color: run.flagged_count > 0 ? 'var(--signal)' : 'inherit', fontWeight: 600 }}>
                      {run.flagged_count}
                    </td>

                    {/* Status (.dot + word) */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`dot ${run.status === 'failed' ? 'hot' : ''}`} style={run.status === 'completed' ? { background: 'var(--ink)' } : {}} />
                        <span style={{ fontSize: '13px' }}>{run.status}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenRun(run.id)}
                          className="mono"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ink)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          Open
                        </button>

                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleMakeActive(run.id)}
                            className="mono"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--ink-2)',
                              cursor: 'pointer',
                            }}
                          >
                            Set active
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onRerun(run)}
                          className="mono"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ink-2)',
                            cursor: 'pointer',
                          }}
                        >
                          Rerun
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(run)}
                          className="mono"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ink-2)',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
