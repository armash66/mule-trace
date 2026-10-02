import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE } from '../../api/client';
import { useStore } from '../../store/store';
import type { RunStatusResponse } from '../../api/types';
import { formatLakhs } from '../../lib/utils';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  LayoutDashboard,
  Network,
  AlertTriangle,
} from 'lucide-react';

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
    let sseWorking = false;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (!isMounted) return;
        sseWorking = true;
        try {
          const data: RunStatusResponse = JSON.parse(event.data);
          setStatus(data);
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
            es.close();
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        // Fallback to polling if SSE fails
        es.close();
      };
    } catch {
      // EventSource unavailable
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
        // ignore polling error
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
      showToast('Pipeline execution cancelled.');
      onCancel();
    } catch {
      showToast('Failed to cancel pipeline.');
    } finally {
      setCancelling(false);
    }
  };

  const currentStageIndex = STAGES.findIndex((s) => s.key === status?.stage);
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isCancelled = status?.status === 'cancelled';

  const handleOpenTopRing = async () => {
    try {
      const rings = await api.getDiscoveredRings();
      if (rings.length > 0) {
        const top = rings[0];
        setSelectedRingId(top.ring_id);
        if (top.accounts.length > 0) {
          setSelectedAccountId(top.accounts[0]);
          navigate(`/workspace/${top.accounts[0]}`);
          return;
        }
      }
    } catch {
      // fallback
    }
    navigate('/workspace');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--line)',
        }}
    >
      {/* Header & Overall progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                {isCompleted
                  ? 'Pipeline Execution Complete'
                  : isFailed
                  ? 'Pipeline Run Failed'
                  : isCancelled
                  ? 'Pipeline Run Cancelled'
                  : 'Executing Mule Detection Pipeline...'}
              </h2>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                [{runId}]
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Elapsed: <span className="mono">{status?.elapsed_seconds?.toFixed(1) || 0}s</span>
            </div>
          </div>

          {!isCompleted && !isFailed && !isCancelled && (
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={cancelling}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--risk-high)',
                backgroundColor: 'transparent',
                border: '1px solid var(--line)',
                cursor: 'pointer',
              }}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Execution'}
            </button>
          )}
        </div>

        {/* Thin Progress Line */}
        <div
          style={{
            height: '4px',
            backgroundColor: 'var(--surface-raised)',
            overflow: 'hidden',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${status?.percent || (isCompleted ? 100 : 5)}%`,
              backgroundColor: isFailed ? 'var(--risk-high)' : isCancelled ? 'var(--ink-3)' : 'var(--accent)',
              transition: 'width 250ms ease',
            }}
          />
        </div>
      </div>

      {/* 5-Stage Stepper Track */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        {STAGES.map((stage, idx) => {
          const isPast = isCompleted || (currentStageIndex > -1 && idx < currentStageIndex);
          const isCurrent = !isCompleted && !isFailed && !isCancelled && stage.key === status?.stage;
          const stageDuration = status?.stage_timings?.[stage.key];

          return (
            <div
              key={stage.key}
              style={{
                padding: '12px',
                backgroundColor: isCurrent ? 'var(--accent-muted)' : 'var(--surface-raised)',
                border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 600, color: 'var(--ink)' }}>
                  {stage.label}
                </span>
                {isPast ? (
                  <CheckCircle2 size={14} color="var(--ok)" />
                ) : isCurrent ? (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: 'var(--accent)',
                      animation: 'subtlePulse 1s infinite',
                    }}
                  />
                ) : (
                  <Clock size={12} color="var(--ink-3)" />
                )}
              </div>

              <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                {stageDuration !== undefined ? `${stageDuration.toFixed(2)}s` : isCurrent ? 'Running...' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Failed Error Message */}
      {isFailed && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--line)',
            fontSize: '12px',
            color: 'var(--risk-high)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          <span>Pipeline failed: {status?.error || 'Internal pipeline processing error.'}</span>
        </div>
      )}

      {/* Completion Summary & Actions */}
      {isCompleted && status?.summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '8px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '12px',
            }}
          >
            <div style={{ padding: '12px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Accounts Ingested</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {status.summary.accounts.toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Transactions Analyzed</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {status.summary.transactions.toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Accounts Flagged</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {status.summary.flagged.toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Rings Discovered</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {status.summary.rings_found}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Est. Rupees at Risk</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--risk-high)', marginTop: '2px' }}>
                {formatLakhs(status.summary.estimated_at_risk)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid var(--line)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <LayoutDashboard size={14} />
              <span>Go to Dashboard</span>
            </button>

            <button
              type="button"
              onClick={handleOpenTopRing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                backgroundColor: 'var(--accent)',
                color: 'var(--paper)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Network size={14} />
              <span>Open Top Ring in Investigate</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
