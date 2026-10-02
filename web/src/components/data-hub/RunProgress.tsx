import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE } from '../../api/client';
import { useStore } from '../../store/store';
import type { RunStatusResponse } from '../../api/types';
import { formatLakhs } from '../../lib/utils';

interface RunProgressProps {
  runId: string;
  onCancel: () => void;
}

const STAGES = [
  { key: 'validate', label: 'Validate' },
  { key: 'build_graph', label: 'Build graph' },
  { key: 'detect', label: 'Detect' },
  { key: 'score', label: 'Score' },
  { key: 'trace_money', label: 'Trace money' },
] as const;

export const RunProgress: React.FC<RunProgressProps> = ({ runId, onCancel }) => {
  const navigate = useNavigate();
  const { setActiveRunId, showToast, setSelectedAccountId, setSelectedRingId } = useStore();
  const [status, setStatus] = useState<RunStatusResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setActiveRunId(runId);
    let isMounted = true;

    // Try SSE first
    const sseUrl = `${API_BASE || 'http://localhost:8000'}/api/v1/runs/${runId}/events`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data: RunStatusResponse = JSON.parse(event.data);
          setStatus(data);
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
            es.close();
          }
        } catch {
          // ignore
        }
      };

      es.onerror = () => {
        es.close();
      };
    } catch {
      // ignore
    }

    // Polling fallback
    const interval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const data = await api.getRunStatus(runId);
        setStatus(data);
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval);
          if (eventSourceRef.current) eventSourceRef.current.close();
        }
      } catch {
        // ignore
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [runId, setActiveRunId]);

  const handleCancelClick = async () => {
    setCancelling(true);
    try {
      await api.cancelRun(runId);
      showToast('Run cancelled.');
      onCancel();
    } catch {
      showToast('Failed to cancel run.');
    } finally {
      setCancelling(false);
    }
  };

  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isCancelled = status?.status === 'cancelled';
  const percent = status?.percent || (isCompleted ? 100 : 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
      {/* Title & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="t-head" style={{ color: 'var(--ink)' }}>
            {isCompleted
              ? 'Run complete'
              : isFailed
              ? 'Run failed'
              : isCancelled
              ? 'Run cancelled'
              : 'Running pipeline'}
          </div>
          <div className="mono" style={{ color: 'var(--ink-2)', marginTop: '4px' }}>
            Run {runId} · {status?.elapsed_seconds?.toFixed(1) || 0}s elapsed
          </div>
        </div>

        {!isCompleted && !isFailed && !isCancelled && (
          <button
            type="button"
            className="btn-ghost"
            onClick={handleCancelClick}
            disabled={cancelling}
            style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Progress = a 2px ink line growing over a 1px rule line */}
      <div style={{ position: 'relative', width: '100%', height: '2px', backgroundColor: 'var(--rule)', margin: '16px 0' }}>
        <div
          style={{
            height: '2px',
            width: `${percent}%`,
            backgroundColor: isFailed ? 'var(--signal)' : 'var(--ink)',
            transition: 'width 250ms ease',
          }}
        />
      </div>

      {/* Stages list in .mono */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', borderTop: '1px solid var(--rule)', paddingTop: '16px' }}>
        {STAGES.map((stage) => {
          const isCurrent = !isCompleted && !isFailed && !isCancelled && stage.key === status?.stage;
          return (
            <div key={stage.key}>
              <div
                className="mono"
                style={{
                  fontWeight: isCurrent ? 700 : 400,
                  color: isCurrent ? 'var(--ink)' : 'var(--ink-2)',
                  borderBottom: isCurrent ? '2px solid var(--ink)' : 'none',
                  paddingBottom: '4px',
                  display: 'inline-block',
                }}
              >
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed Results Summary */}
      {isCompleted && status?.summary && (
        <div style={{ borderTop: '2px solid var(--ink)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
                Accounts scored
              </div>
              <div className="t-hero" style={{ fontSize: '40px', color: 'var(--ink)' }}>
                {status.summary.accounts}
              </div>
            </div>

            <div>
              <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
                Flagged for review
              </div>
              <div className="t-hero" style={{ fontSize: '40px', color: 'var(--signal)' }}>
                {status.summary.flagged}
              </div>
            </div>

            <div>
              <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
                Rings found
              </div>
              <div className="t-hero" style={{ fontSize: '40px', color: 'var(--ink)' }}>
                {status.summary.rings_found}
              </div>
            </div>

            <div>
              <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
                Stolen money traced
              </div>
              <div className="t-hero" style={{ fontSize: '40px', color: 'var(--signal)' }}>
                {formatLakhs(status.summary.estimated_at_risk)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                navigate('/workspace');
              }}
            >
              Open Investigate
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate('/overview')}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Go to Overview
            </button>
          </div>
        </div>
      )}

      {/* Failed error message */}
      {isFailed && (
        <div style={{ borderTop: '2px solid var(--ink)', paddingTop: '16px' }}>
          <div className="mono" style={{ color: 'var(--signal)' }}>
            Fix: {status?.error || 'Pipeline execution failed.'}
          </div>
        </div>
      )}
    </div>
  );
};
