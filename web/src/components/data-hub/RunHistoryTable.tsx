import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useStore } from '../../store/store';
import type { RunItem } from '../../api/types';
import { formatDateTime } from '../../lib/utils';
import {
  Play,
  RotateCw,
  Download,
  Trash2,
  Edit2,
  Check,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

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
      showToast('Active run updated app-wide.');
    } catch {
      showToast('Failed to activate run.');
    }
  };

  const handleOpenRun = (runId: string) => {
    setActiveRunId(runId);
    navigate('/');
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
    // 5-second undo toast
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

  const getStatusDot = (status: string) => {
    if (status === 'completed') {
      return <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--ok)' }} />;
    }
    if (status === 'running') {
      return (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            animation: 'subtlePulse 1s infinite',
          }}
        />
      );
    }
    if (status === 'failed') {
      return <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--risk-high)' }} />;
    }
    return <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--ink-3)' }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>Historical Detection Runs</h3>
          <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Previous data ingestion batches and benchmark runs with full traceability.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          <RotateCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--surface)',
          overflow: 'hidden',
        }}
      >
        {runs.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px' }}>
            No runs yet. Drop a file above to start.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '28%' }}>Run Name</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '18%' }}>Created</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '12%' }}>Source</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '10%' }}>Rows</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '10%' }}>Flagged</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '10%' }}>Status</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const isActive = activeRunId === run.id;

                return (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      backgroundColor: isActive ? 'var(--accent-muted)' : 'var(--surface)',
                    }}
                  >
                    {/* Name + inline rename */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
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
                            style={{
                              padding: '2px 6px',
                              fontSize: '12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--accent)',
                              backgroundColor: 'var(--surface)',
                              color: 'var(--ink)',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => submitRename(run.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ok)' }}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{run.name}</span>
                          {isActive && (
                            <span
                              className="mono"
                              style={{
                                fontSize: '10px',
                                color: 'var(--accent)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '1px 4px',
                                border: '1px solid var(--accent)',
                                borderRadius: '3px',
                              }}
                            >
                              ACTIVE
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startRename(run)}
                            title="Rename"
                            style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                      )}
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '2px' }}>
                        Preset: {run.config_preset}
                      </div>
                    </td>

                    {/* Created */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span className="mono" style={{ color: 'var(--ink-2)', fontSize: '11px' }}>
                        {formatDateTime(run.created_at)}
                      </span>
                    </td>

                    {/* Source */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span style={{ color: 'var(--ink-2)', fontSize: '12px' }}>{run.source}</span>
                    </td>

                    {/* Rows */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span className="mono" style={{ color: 'var(--ink)' }}>
                        {run.txn_count?.toLocaleString() || '—'}
                      </span>
                    </td>

                    {/* Flagged */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <span className="mono" style={{ fontWeight: 600, color: run.flagged_count > 0 ? 'var(--risk-high)' : 'var(--ink)' }}>
                        {run.flagged_count}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getStatusDot(run.status)}
                        <span style={{ textTransform: 'capitalize', color: 'var(--ink)', fontSize: '11px' }}>
                          {run.status}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenRun(run.id)}
                          title="Open dashboard with this run"
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'var(--surface-raised)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--ink)',
                            cursor: 'pointer',
                          }}
                        >
                          Open
                        </button>

                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleMakeActive(run.id)}
                            title="Make active dataset"
                            style={{
                              padding: '3px 8px',
                              backgroundColor: 'transparent',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11px',
                              color: 'var(--ink-2)',
                              cursor: 'pointer',
                            }}
                          >
                            Set Active
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onRerun(run)}
                          title="Re-run with different config"
                          style={{
                            padding: '3px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ink-3)',
                            cursor: 'pointer',
                          }}
                        >
                          <RotateCw size={13} />
                        </button>

                        <a
                          href={api.getFlaggedCsvUrl(run.id)}
                          download={`flagged_accounts_${run.id}.csv`}
                          title="Download flagged accounts CSV"
                          style={{
                            padding: '3px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ink-3)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Download size={13} />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDelete(run)}
                          title="Delete run (with 5s undo)"
                          style={{
                            padding: '3px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--ink-3)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={13} />
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
